"""
Export features for model training from file
"""
from __future__ import annotations
import argparse
import logging
from datetime import datetime, timedelta
from typing import Optional
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
        productIds: Optional[list[str]] = None,
        batchSize: int = 100
    ) -> None:
        """
        Export features to CSV

        Args:
            inputFile: Input data file path
            outputCsv: Output CSV path
            productIds: Optional list of product IDs to filter
            batchSize: Number of products to process per batch
        """
        logger.info(f"Starting feature export from {inputFile}")

        # Load data from file
        df = self.dataLoader.load_from_file(inputFile)

        # Data wrangling
        df.rename(columns={'InvoiceNo': 'invoice_no', 'StockCode': 'stock_code', 'Description': 'description', 'Quantity': 'quantity', 'InvoiceDate': 'invoice_date', 'UnitPrice': 'unit_price', 'CustomerID': 'customer_id', 'Country': 'country'}, inplace=True)
        df['invoice_date'] = pd.to_datetime(df['invoice_date'])
        df['date'] = df['invoice_date'].dt.date
        df['product_id'] = df['stock_code']
        df['store_id'] = df['country']
        df.dropna(subset=['product_id', 'customer_id'], inplace=True)

        # Create the necessary dataframes
        productStats = df.groupby(['product_id', 'date']).agg(
            views=('invoice_no', 'nunique'),
            purchases=('quantity', 'sum'),
            addToCarts=('invoice_no', 'nunique'),
            revenue=('unit_price', lambda x: (x * df.loc[x.index, 'quantity']).sum())
        ).reset_index()
        productStats.rename(columns={'product_id': 'productId'}, inplace=True)

        storeStats = df.groupby(['store_id', 'date']).agg(
            views=('invoice_no', 'nunique'),
            purchases=('quantity', 'sum'),
            addToCarts=('invoice_no', 'nunique'),
            revenue=('unit_price', lambda x: (x * df.loc[x.index, 'quantity']).sum()),
            checkouts=('invoice_no', 'nunique')
        ).reset_index()
        storeStats.rename(columns={'store_id': 'storeId'}, inplace=True)

        variants = df[['product_id', 'unit_price']].drop_duplicates()
        variants.rename(columns={'product_id': 'productId', 'unit_price': 'price'}, inplace=True)
        variants['id'] = variants['productId']

        inventory = df[['product_id', 'quantity', 'invoice_date']].copy()
        inventory.rename(columns={'product_id': 'variantId', 'invoice_date': 'updatedAt'}, inplace=True)
        inventory['id'] = inventory['variantId']

        reviews = df[['product_id', 'invoice_date']].copy()
        reviews.rename(columns={'product_id': 'productId', 'invoice_date': 'createdAt'}, inplace=True)
        reviews['rating'] = 5
        reviews['id'] = reviews['productId']

        products = df[['product_id', 'store_id']].drop_duplicates()
        products.rename(columns={'product_id': 'id', 'store_id': 'storeId'}, inplace=True)

        if productIds:
            products = products[products['id'].isin(productIds)]

        if products.empty:
            logger.warning("No products found")
            return

        logger.info(f"Processing {len(products)} products")

        startDate = df['date'].min().strftime('%Y-%m-%d')
        endDate = df['date'].max().strftime('%Y-%m-%d')

        # Generate snapshot dates
        snapshotDates = pd.date_range(
            start=startDate,
            end=endDate,
            freq='D'
        ).to_pydatetime().tolist()

        logger.info(f"Generating features for {len(snapshotDates)} days")

        # Process products in batches
        allRows = []
        totalProducts = len(products)

        for batchStart in range(0, totalProducts, batchSize):
            batchEnd = min(batchStart + batchSize, totalProducts)
            batchProducts = products.iloc[batchStart:batchEnd]

            logger.info(f"Processing batch {batchStart}-{batchEnd} of {totalProducts}")

            for _, product in tqdm(
                batchProducts.iterrows(),
                total=len(batchProducts),
                desc=f"Batch {batchStart//batchSize + 1}"
            ):
                try:
                    rows = self._buildProductFeatures(
                        product['id'],
                        product['storeId'],
                        snapshotDates,
                        productStats,
                        storeStats,
                        variants,
                        inventory,
                        reviews
                    )
                    allRows.extend(rows)
                except Exception as e:
                    logger.error(f"Failed to process product {product['id']}: {e}")
                    continue

        # Save to CSV
        if not allRows:
            logger.warning("No feature rows generated")
            return

        logger.info("Converting to DataFrame and saving...")
        dfOut = pd.DataFrame(allRows)

        # Ensure column order matches feature config
        columns = [
            'productId', 'storeId', 'snapshotDate',
            *featureConfig.featureColumns,
            'futureSales14d', 'stockout14d'
        ]

        # Add missing columns
        for col in columns:
            if col not in dfOut.columns:
                dfOut[col] = 0

        dfOut = dfOut[columns]
        dfOut.to_csv(outputCsv, index=False)

        logger.info(f"Successfully exported {len(dfOut)} feature rows to {outputCsv}")

        # Log statistics
        self._logStatistics(dfOut)

    def _buildProductFeatures(
        self,
        productId: str,
        storeId: Optional[str],
        snapshotDates: list[datetime],
        productStats: pd.DataFrame,
        storeStats: pd.DataFrame,
        variants: pd.DataFrame,
        inventory: pd.DataFrame,
        reviews: pd.DataFrame
    ) -> list[dict]:
        """Build feature rows for a single product"""

        # Create extended date index (with padding)
        paddedStart = snapshotDates[0] - timedelta(days=featureConfig.paddingDays)
        dateIndex = pd.date_range(
            start=paddedStart,
            end=snapshotDates[-1],
            freq='D'
        )

        # Build timeseries for product
        prodStatsSubset = productStats[
            productStats['productId'] == productId
        ].copy()

        ts = self.featureEngineer.buildTimeseriesTable(prodStatsSubset, dateIndex)

        # Build store timeseries
        if storeId:
            storeStatsSubset = storeStats[
                storeStats['storeId'] == storeId
            ].copy()
            storeTs = self.featureEngineer.buildTimeseriesTable(
                storeStatsSubset[['date', 'views', 'purchases', 'addToCarts', 'revenue']],
                dateIndex
            )
        else:
            storeTs = pd.DataFrame()

        # Compute price statistics
        variantsSubset = variants[variants['productId'] == productId]
        if variantsSubset.empty:
            priceStats = {'avg': 0.0, 'min': 0.0, 'max': 0.0}
            variantIds = []
        else:
            priceStats = {
                'avg': float(variantsSubset['price'].mean()),
                'min': float(variantsSubset['price'].min()),
                'max': float(variantsSubset['price'].max())
            }
            variantIds = variantsSubset['id'].tolist()

        # Compute inventory by date
        inventoryByDate = self.featureEngineer.computeInventoryByDate(
            inventory,
            variantIds,
            dateIndex
        )

        # Compute cumulative reviews
        reviewsCount, reviewsAvg = self.featureEngineer.computeReviewsCumulative(
            reviews,
            productId,
            dateIndex
        )

        # Compute rolling windows
        rollingWindows = self.featureEngineer.computeRollingWindows(ts)

        # Get last restock date
        inventorySubset = inventory[inventory['variantId'].isin(variantIds)]
        lastRestockDate = (
            inventorySubset['updatedAt'].max()
            if not inventorySubset.empty
            else None
        )

        # Build feature rows for each snapshot
        rows = []
        paddingOffset = featureConfig.paddingDays

        for snapshotDate in snapshotDates:
            # Find index in full date range
            dateIdx = (snapshotDate.date() - dateIndex[0].date()).days

            if dateIdx < 0 or dateIdx >= len(dateIndex):
                continue

            # Build features
            featureRow = self.featureEngineer.buildFeatureRow(
                productId=productId,
                storeId=storeId,
                snapshotDate=snapshotDate,
                dateIndex=dateIdx,
                rollingWindows=rollingWindows,
                storeTs=storeTs,
                priceStats=priceStats,
                inventoryByDate=inventoryByDate,
                reviewsCount=reviewsCount,
                reviewsAvg=reviewsAvg,
                lastRestockDate=lastRestockDate
            )

            # Compute label
            label = self.featureEngineer.computeLabel(
                productId=productId,
                snapshotDate=snapshotDate,
                inventoryQty=featureRow['inventoryQty'],
                productStatsDf=productStats
            )

            # Merge features and label
            featureRow.update(label)
            rows.append(featureRow)

        return rows

    def _logStatistics(self, df: pd.DataFrame) -> None:
        """Log dataset statistics"""
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
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Export features for model training'
    )
    parser.add_argument(
        '--input',
        required=True,
        help='Input data file path'
    )
    parser.add_argument(
        '--out',
        default='data/features.csv',
        help='Output CSV path'
    )
    parser.add_argument(
        '--products',
        nargs='*',
        help='Optional product IDs to filter'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Batch size for processing'
    )

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
