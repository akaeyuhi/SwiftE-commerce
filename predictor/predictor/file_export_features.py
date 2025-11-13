"""
Export features for model training from file
"""
from __future__ import annotations
import argparse
import logging
from datetime import timedelta
from typing import Optional, List, Dict, Any

import pandas as pd
from tqdm import tqdm

from .config import featureConfig
from .file_data_loader import FileDataLoader
from .feature_engineer import FeatureEngineer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FileFeatureExporter:
    """Export features for machine learning training from file"""

    def __init__(self):
        self.dataLoader = FileDataLoader()
        self.featureEngineer = FeatureEngineer()

    def exportFeatures(
        self,
        inputFile: str,
        outputCsv: str,
        productIds: Optional[List[str]] = None,
        batchSize: int = 100
    ) -> None:
        logger.info(f"Starting feature export from {inputFile}")

        # Load and standardize time types
        df = self.dataLoader.load_from_file(inputFile)

        # Canonical column mapping
        df = df.rename(columns={
            'InvoiceNo': 'invoice_no',
            'StockCode': 'stock_code',
            'Description': 'description',
            'Quantity': 'quantity',
            'InvoiceDate': 'invoice_date',
            'UnitPrice': 'unit_price',
            'CustomerID': 'customer_id',
            'Country': 'country'
        })

        # Ensure timezone-naive pandas Timestamps and a normalized date column (midnight)
        df['invoice_date'] = pd.to_datetime(df['invoice_date'], errors='coerce').dt.tz_localize(None)
        df['date'] = df['invoice_date'].dt.normalize()  # KEEP AS TIMESTAMP, not .dt.date

        df['product_id'] = df['stock_code']
        df['store_id'] = df['country']
        df = df.dropna(subset=['product_id', 'customer_id'])

        # Product daily stats
        productStats = (
            df.groupby(['product_id', 'date'])
              .agg(
                  views=('invoice_no', 'nunique'),
                  purchases=('quantity', 'sum'),
                  addToCarts=('invoice_no', 'nunique'),
                  revenue=('unit_price', lambda x: (x * df.loc[x.index, 'quantity']).sum())
              )
              .reset_index()
              .rename(columns={'product_id': 'productId'})
        )
        # Ensure 'date' is Timestamp
        productStats['date'] = pd.to_datetime(productStats['date']).dt.tz_localize(None).dt.normalize()

        # Store daily stats
        storeStats = (
            df.groupby(['store_id', 'date'])
              .agg(
                  views=('invoice_no', 'nunique'),
                  purchases=('quantity', 'sum'),
                  addToCarts=('invoice_no', 'nunique'),
                  revenue=('unit_price', lambda x: (x * df.loc[x.index, 'quantity']).sum()),
                  checkouts=('invoice_no', 'nunique')
              )
              .reset_index()
              .rename(columns={'store_id': 'storeId'})
        )
        storeStats['date'] = pd.to_datetime(storeStats['date']).dt.tz_localize(None).dt.normalize()

        # Variants price snapshot
        variants = (
            df[['product_id', 'unit_price']].drop_duplicates()
              .rename(columns={'product_id': 'productId', 'unit_price': 'price'})
        )
        variants['id'] = variants['productId']

        # Inventory events with normalized timestamps
        inventory = (
            df[['product_id', 'quantity', 'invoice_date']]
              .rename(columns={'product_id': 'variantId', 'invoice_date': 'updatedAt'})
              .copy()
        )
        inventory['updatedAt'] = pd.to_datetime(inventory['updatedAt'], errors='coerce').dt.tz_localize(None).dt.normalize()
        inventory['id'] = inventory['variantId']

        # Reviews with normalized timestamps
        reviews = (
            df[['product_id', 'invoice_date']]
              .rename(columns={'product_id': 'productId', 'invoice_date': 'createdAt'})
              .copy()
        )
        reviews['createdAt'] = pd.to_datetime(reviews['createdAt'], errors='coerce').dt.tz_localize(None).dt.normalize()
        reviews['rating'] = 5
        reviews['id'] = reviews['productId']

        # Product list
        products = (
            df[['product_id', 'store_id']]
              .drop_duplicates()
              .rename(columns={'product_id': 'id', 'store_id': 'storeId'})
        )
        if productIds:
            products = products[products['id'].isin(productIds)]
        if products.empty:
            logger.warning("No products found")
            return

        logger.info(f"Processing {len(products)} products")

        # Snapshot date range (Timestamps)
        start_ts = pd.to_datetime(df['date'].min()).normalize()
        end_ts = pd.to_datetime(df['date'].max()).normalize()
        snapshotDates = pd.date_range(start=start_ts, end=end_ts, freq='D')

        logger.info(f"Generating features for {len(snapshotDates)} days")

        # Process in batches
        allRows: List[Dict[str, Any]] = []
        totalProducts = len(products)

        for batchStart in range(0, totalProducts, batchSize):
            batchEnd = min(batchStart + batchSize, totalProducts)
            batchProducts = products.iloc[batchStart:batchEnd]

            logger.info(f"Processing batch {batchStart}-{batchEnd} of {totalProducts}")

            for _, product in tqdm(batchProducts.iterrows(), total=len(batchProducts), desc=f"Batch {batchStart//batchSize + 1}", leave=False):
                try:
                    rows = self._buildProductFeatures(
                        productId=product['id'],
                        storeId=product['storeId'],
                        snapshotDates=snapshotDates,             # Timestamps
                        productStats=productStats,
                        storeStats=storeStats,
                        variants=variants,
                        inventory=inventory,
                        reviews=reviews
                    )
                    allRows.extend(rows)
                except Exception as e:
                    logger.exception(f"Failed to process product {product['id']}: {e}")
                    continue

        if not allRows:
            logger.warning("No feature rows generated")
            return

        logger.info("Converting to DataFrame and saving...")
        dfOut = pd.DataFrame(allRows)

        # Ensure output columns and order
        columns = [
            'productId', 'storeId', 'snapshotDate',
            *featureConfig.featureColumns,
            'futureSales14d', 'stockout14d'
        ]
        for col in columns:
            if col not in dfOut.columns:
                dfOut[col] = 0

        # Format snapshotDate as date string for CSV
        dfOut['snapshotDate'] = pd.to_datetime(dfOut['snapshotDate'], errors='coerce').dt.normalize().dt.strftime('%Y-%m-%d')
        dfOut = dfOut[columns]
        dfOut.to_csv(outputCsv, index=False)

        logger.info(f"Successfully exported {len(dfOut)} feature rows to {outputCsv}")
        self._logStatistics(dfOut)

    def _buildProductFeatures(
        self,
        productId: str,
        storeId: Optional[str],
        snapshotDates: pd.DatetimeIndex,         # Timestamps
        productStats: pd.DataFrame,
        storeStats: pd.DataFrame,
        variants: pd.DataFrame,
        inventory: pd.DataFrame,
        reviews: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Build feature rows for a single product"""

        # Extended date index (timestamps, normalized)
        paddedStart = snapshotDates[0] - timedelta(days=featureConfig.paddingDays)
        dateIndex = pd.date_range(start=paddedStart, end=snapshotDates[-1], freq='D')

        # Product timeseries
        prodStatsSubset = productStats[productStats['productId'] == productId].copy()
        # Ensure 'date' is Timestamp and normalized
        prodStatsSubset['date'] = pd.to_datetime(prodStatsSubset['date'], errors='coerce').dt.tz_localize(None).dt.normalize()

        ts = self.featureEngineer.buildTimeseriesTable(prodStatsSubset, dateIndex)

        # Store timeseries
        if storeId:
            storeStatsSubset = storeStats[storeStats['storeId'] == storeId].copy()
            storeStatsSubset['date'] = pd.to_datetime(storeStatsSubset['date'], errors='coerce').dt.tz_localize(None).dt.normalize()
            storeTs = self.featureEngineer.buildTimeseriesTable(
                storeStatsSubset[['date', 'views', 'purchases', 'addToCarts', 'revenue']],
                dateIndex
            )
        else:
            storeTs = pd.DataFrame()

        # Price stats
        variantsSubset = variants[variants['productId'] == productId]
        if variantsSubset.empty:
            priceStats = {'avg': 0.0, 'min': 0.0, 'max': 0.0}
            variantIds: List[str] = []
        else:
            priceStats = {
                'avg': float(variantsSubset['price'].mean()),
                'min': float(variantsSubset['price'].min()),
                'max': float(variantsSubset['price'].max())
            }
            variantIds = variantsSubset['id'].tolist()

        # Inventory by date (updatedAt already normalized)
        inventoryByDate = self.featureEngineer.computeInventoryByDate(
            invDf=inventory,
            variantIds=variantIds,
            dateIndex=dateIndex
        )

        # Reviews cumulative (createdAt already normalized)
        reviewsCount, reviewsAvg = self.featureEngineer.computeReviewsCumulative(
            reviewsDf=reviews,
            productId=productId,
            dateIndex=dateIndex
        )

        # Rolling windows
        rollingWindows = self.featureEngineer.computeRollingWindows(ts)

        # Last restock
        inventorySubset = inventory[inventory['variantId'].isin(variantIds)]
        lastRestockDate = inventorySubset['updatedAt'].max() if not inventorySubset.empty else None

        # Build rows per snapshot
        rows: List[Dict[str, Any]] = []

        # For efficient position lookup, map date to index
        index_positions = {d: i for i, d in enumerate(dateIndex)}

        for snapshotDate in snapshotDates:
            snap_norm = pd.Timestamp(snapshotDate).normalize()
            if snap_norm not in index_positions:
                continue
            dateIdx = index_positions[snap_norm]

            # Build feature row
            featureRow = self.featureEngineer.buildFeatureRow(
                productId=productId,
                storeId=storeId,
                snapshotDate=snap_norm,                   # Keep Timestamp
                dateIndex=dateIdx,
                rollingWindows=rollingWindows,
                storeTs=storeTs,
                priceStats=priceStats,
                inventoryByDate=inventoryByDate,
                reviewsCount=reviewsCount,
                reviewsAvg=reviewsAvg,
                lastRestockDate=lastRestockDate
            )

            # Label (ensure productStatsDf['date'] is Timestamp and comparable)
            label = self.featureEngineer.computeLabel(
                productId=productId,
                snapshotDate=snap_norm,
                inventoryQty=featureRow['inventoryQty'],
                productStatsDf=productStats
            )

            featureRow.update(label)
            rows.append(featureRow)

        return rows

    def _logStatistics(self, df: pd.DataFrame) -> None:
        logger.info("Dataset Statistics:")
        logger.info(f"  Total rows: {len(df)}")
        logger.info(f"  Unique products: {df['productId'].nunique()}")
        logger.info(f"  Date range: {df['snapshotDate'].min()} to {df['snapshotDate'].max()}")

        if 'stockout14d' in df.columns:
            stockoutRate = df['stockout14d'].mean()
            logger.info(f"  Stockout rate: {stockoutRate:.2%}")
            logger.info(f"  Stockout samples: {df['stockout14d'].sum()}")
            logger.info(f"  Non-stockout samples: {(1 - df['stockout14d']).sum()}")


def main():
    parser = argparse.ArgumentParser(description='Export features for model training')
    parser.add_argument('--input', required=True, help='Input data file path')
    parser.add_argument('--out', default='data/features.csv', help='Output CSV path')
    parser.add_argument('--products', nargs='*', help='Optional product IDs to filter')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for processing')
    args = parser.parse_args()

    exporter = FileFeatureExporter()
    exporter.exportFeatures(
        inputFile=args.input,
        outputCsv=args.out,
        productIds=args.products,
        batchSize=args.batch_size
    )


if __name__ == '__main__':
    main()
