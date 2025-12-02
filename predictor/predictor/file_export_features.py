"""
Export features for model training from file
Supports:
- MLP/LightGBM (Wide format with rolling windows)
- TFT (Long format time-series)
"""
from __future__ import annotations
import argparse
import logging
from datetime import timedelta
from typing import Optional, List, Dict, Any
from concurrent.futures import ProcessPoolExecutor
import os

import pandas as pd
import numpy as np
from tqdm import tqdm

from .config import featureConfig
from .file_data_loader import FileDataLoader
from .feature_engineer import FeatureEngineer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BatchFeatureProcessor:
    """Optimized batch feature processing with vectorization"""

    def __init__(self, featureEngineer: FeatureEngineer):
        self.featureEngineer = featureEngineer

    def processBatch(
        self,
        batchProducts: List[tuple],
        snapshotDates: pd.DatetimeIndex,
        productStats: pd.DataFrame,
        storeStats: pd.DataFrame,
        variants: pd.DataFrame,
        inventory: pd.DataFrame,
        reviews: pd.DataFrame,
        modelType: str = 'mlp',
        globalMinDate: Optional[pd.Timestamp] = None
    ) -> List[Dict[str, Any]]:
        """Process entire batch based on model type"""

        # Pre-compute common index
        if modelType == 'mlp':
            paddedStart = snapshotDates[0] - timedelta(days=featureConfig.paddingDays)
        else:
            paddedStart = snapshotDates[0]

        dateIndex = pd.date_range(start=paddedStart, end=snapshotDates[-1], freq='D')
        index_positions = {d: i for i, d in enumerate(dateIndex)}

        # Filter data once per batch
        batchProductIds = [pid for pid, _ in batchProducts]

        # Product Stats: Now filtered by Product AND Store (Fixed Aggregation)
        # We need to filter broadly first, then specific per row
        prodStatsSubset = productStats[productStats['productId'].isin(batchProductIds)].copy()
        prodStatsSubset['date'] = pd.to_datetime(prodStatsSubset['date'], errors='coerce').dt.tz_localize(None).dt.normalize()

        batchStoreIds = [sid for _, sid in batchProducts]
        storeStatsSubset = storeStats[storeStats['storeId'].isin(batchStoreIds)].copy()
        storeStatsSubset['date'] = pd.to_datetime(storeStatsSubset['date'], errors='coerce').dt.tz_localize(None).dt.normalize()

        variantsSubset = variants[variants['productId'].isin(batchProductIds)].copy()
        inventorySubset = inventory[inventory['variantId'].isin(batchProductIds)].copy()
        reviewsSubset = reviews[reviews['productId'].isin(batchProductIds)].copy()

        allRows = []

        # Dispatch based on model type
        for productId, storeId in batchProducts:
            try:
                if modelType == 'tft':
                    rows = self._buildProductFeaturesTFT(
                        productId=productId,
                        storeId=storeId,
                        dateIndex=dateIndex,
                        globalMinDate=globalMinDate,
                        prodStatsSubset=prodStatsSubset,
                        variantsSubset=variantsSubset,
                        inventorySubset=inventorySubset
                    )
                else:
                    rows = self._buildProductFeaturesMLP(
                        productId=productId,
                        storeId=storeId,
                        snapshotDates=snapshotDates,
                        dateIndex=dateIndex,
                        index_positions=index_positions,
                        prodStatsSubset=prodStatsSubset,
                        storeStatsSubset=storeStatsSubset,
                        variantsSubset=variantsSubset,
                        inventorySubset=inventorySubset,
                        reviewsSubset=reviewsSubset
                    )
                allRows.extend(rows)
            except Exception as e:
                logger.error(f"Failed to process product {productId} at store {storeId}: {e}")
                continue

        return allRows

    def _buildProductFeaturesTFT(
        self,
        productId: str,
        storeId: Optional[str],
        dateIndex: pd.DatetimeIndex,
        globalMinDate: pd.Timestamp,
        prodStatsSubset: pd.DataFrame,
        variantsSubset: pd.DataFrame,
        inventorySubset: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Build long-format time-series for TFT"""

        # 1. Base Time Series
        ts_df = pd.DataFrame({'date': dateIndex})
        ts_df['productId'] = str(productId)
        ts_df['storeId'] = str(storeId) if storeId else 'unknown'

        # 2. Merge Sales/Stats (FIX: Merge on Date AND Store)
        # Filter stats for this specific product AND store
        stats_mask = (prodStatsSubset['productId'] == productId)
        if storeId:
            stats_mask &= (prodStatsSubset['storeId'] == storeId)

        prodStats = prodStatsSubset[stats_mask]

        if not prodStats.empty:
            ts_df = pd.merge(ts_df, prodStats[['date', 'purchases', 'views', 'revenue']], on='date', how='left')

        # Fill NaNs with 0 for observed inputs
        cols_to_fill = ['purchases', 'views', 'revenue']
        for col in cols_to_fill:
            if col not in ts_df.columns:
                ts_df[col] = 0.0
            ts_df[col] = ts_df[col].fillna(0.0)

        # 3. Merge Inventory (Asof merge logic)
        variants = variantsSubset[variantsSubset['productId'] == productId]
        variantIds = variants['id'].tolist() if not variants.empty else []

        inventoryByDate = self.featureEngineer.computeInventoryByDate(
            invDf=inventorySubset[inventorySubset['variantId'].isin(variantIds)],
            variantIds=variantIds,
            dateIndex=dateIndex
        )
        ts_df['inventoryQty'] = inventoryByDate.values.astype(float)

        # 4. Calculate TFT Specific Features (FIX: CAST TO FLOAT)

        # Time Index (Integer for indexing, but often cast to float in trainer for normalization)
        ts_df['time_idx'] = (ts_df['date'] - globalMinDate).dt.days

        # Temporal features as FLOAT for PyTorch
        ts_df['dayOfWeek'] = ts_df['date'].dt.dayofweek.astype(float)
        ts_df['dayOfMonth'] = ts_df['date'].dt.day.astype(float)
        ts_df['month'] = ts_df['date'].dt.month.astype(float)
        ts_df['isWeekend'] = ts_df['dayOfWeek'].apply(lambda x: 1.0 if x >= 5.0 else 0.0)

        # Log transforms (stabilize training)
        # Clip negative values to 0 to prevent log errors
        ts_df['log_purchases'] = np.log1p(ts_df['purchases'].clip(lower=0))
        ts_df['log_views'] = np.log1p(ts_df['views'].clip(lower=0))

        # Format date for CSV
        ts_df['date'] = ts_df['date'].dt.strftime('%Y-%m-%d')

        return ts_df.to_dict('records')

    def _buildProductFeaturesMLP(
        self,
        productId: str,
        storeId: Optional[str],
        snapshotDates: pd.DatetimeIndex,
        dateIndex: pd.DatetimeIndex,
        index_positions: Dict,
        prodStatsSubset: pd.DataFrame,
        storeStatsSubset: pd.DataFrame,
        variantsSubset: pd.DataFrame,
        inventorySubset: pd.DataFrame,
        reviewsSubset: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Build wide-format windowed features for MLP/LightGBM"""
        # (MLP logic remains largely the same, just ensuring aggregations are correct)

        # Filter Stats for Product AND Store
        stats_mask = (prodStatsSubset['productId'] == productId)
        if storeId:
            stats_mask &= (prodStatsSubset['storeId'] == storeId)
        prodStats = prodStatsSubset[stats_mask]

        ts = self.featureEngineer.buildTimeseriesTable(prodStats, dateIndex)

        # Store timeseries
        if storeId:
            storeStats = storeStatsSubset[storeStatsSubset['storeId'] == storeId]
            storeTs = self.featureEngineer.buildTimeseriesTable(
                storeStats[['date', 'views', 'purchases', 'addToCarts', 'revenue']],
                dateIndex
            )
        else:
            storeTs = pd.DataFrame()

        # Price stats
        variants = variantsSubset[variantsSubset['productId'] == productId]
        if variants.empty:
            priceStats = {'avg': 0.0, 'min': 0.0, 'max': 0.0}
            variantIds = []
        else:
            priceStats = {
                'avg': float(variants['price'].mean()),
                'min': float(variants['price'].min()),
                'max': float(variants['price'].max())
            }
            variantIds = variants['id'].tolist()

        # Inventory
        inventory = inventorySubset[inventorySubset['variantId'].isin(variantIds)]
        inventoryByDate = self.featureEngineer.computeInventoryByDate(
            invDf=inventory,
            variantIds=variantIds,
            dateIndex=dateIndex
        )

        # Reviews
        reviews = reviewsSubset[reviewsSubset['productId'] == productId]
        reviewsCount, reviewsAvg = self.featureEngineer.computeReviewsCumulative(
            reviewsDf=reviews,
            productId=productId,
            dateIndex=dateIndex
        )

        # Rolling windows
        rollingWindows = self.featureEngineer.computeRollingWindows(ts)

        # Last restock
        lastRestockDate = inventory['updatedAt'].max() if not inventory.empty else None

        # Build Vectorized Rows
        return self._buildFeatureRowsVectorized(
            productId=productId,
            storeId=storeId,
            snapshotDates=snapshotDates,
            index_positions=index_positions,
            rollingWindows=rollingWindows,
            storeTs=storeTs,
            priceStats=priceStats,
            inventoryByDate=inventoryByDate,
            reviewsCount=reviewsCount,
            reviewsAvg=reviewsAvg,
            lastRestockDate=lastRestockDate,
            prodStats=prodStats
        )

    def _buildFeatureRowsVectorized(
        self,
        productId: str,
        storeId: Optional[str],
        snapshotDates: pd.DatetimeIndex,
        index_positions: Dict,
        rollingWindows: Dict[str, pd.DataFrame],
        storeTs: pd.DataFrame,
        priceStats: Dict[str, float],
        inventoryByDate: pd.Series,
        reviewsCount: pd.Series,
        reviewsAvg: pd.Series,
        lastRestockDate: Optional[pd.Timestamp],
        prodStats: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Build all feature rows for a product using vectorized operations (MLP logic)"""

        rows: List[Dict[str, Any]] = []

        # Get snapshot indices once
        snapshotIndices = []
        snapshotNorms = []
        for snapshotDate in snapshotDates:
            snap_norm = pd.Timestamp(snapshotDate).normalize()
            if snap_norm in index_positions:
                snapshotIndices.append(index_positions[snap_norm])
                snapshotNorms.append(snap_norm)

        if not snapshotIndices:
            return rows

        # Vectorized extraction of rolling windows
        ro7 = rollingWindows['7d'].iloc[snapshotIndices]
        ro14 = rollingWindows['14d'].iloc[snapshotIndices]
        ro30 = rollingWindows['30d'].iloc[snapshotIndices]

        # Extract as numpy arrays for speed
        sales7d = ro7['purchases'].values.astype(np.int64)
        sales14d = ro14['purchases'].values.astype(np.int64)
        sales30d = ro30['purchases'].values.astype(np.int64)
        views7d = ro7['views'].values.astype(np.int64)
        views30d = ro30['views'].values.astype(np.int64)
        addToCarts7d = ro7['addToCarts'].values.astype(np.int64)

        # Vectorized derived metrics
        sales7dPerDay = sales7d / 7.0
        sales30dPerDay = sales30d / 30.0
        salesRatio7To30 = np.divide(sales7d, sales30d, where=sales30d > 0, out=np.zeros_like(sales7d, dtype=float))
        viewToPurchase7d = np.divide(sales7d, views7d, where=views7d > 0, out=np.zeros_like(sales7d, dtype=float))

        # Store metrics
        if not storeTs.empty:
            storeViews7d = storeTs.iloc[snapshotIndices]['views'].values.astype(np.int64)
            storePurchases7d = storeTs.iloc[snapshotIndices]['purchases'].values.astype(np.int64)
        else:
            storeViews7d = np.zeros(len(snapshotIndices), dtype=np.int64)
            storePurchases7d = np.zeros(len(snapshotIndices), dtype=np.int64)

        # Inventory & reviews
        inventoryQty = inventoryByDate.iloc[snapshotIndices].values.astype(np.int64)
        avgRating = reviewsAvg.iloc[snapshotIndices].values.astype(np.float64)
        ratingCount = reviewsCount.iloc[snapshotIndices].values.astype(np.int64)

        # Days since restock (vectorized)
        if lastRestockDate:
            daysSinceRestock = np.array([
                (snap_norm.date() - lastRestockDate.date()).days if lastRestockDate <= snap_norm else 365
                for snap_norm in snapshotNorms
            ])
        else:
            daysSinceRestock = np.full(len(snapshotIndices), 365, dtype=np.int64)

        # Temporal features
        dayOfWeek = np.array([sn.weekday() for sn in snapshotNorms])
        isWeekend = (dayOfWeek >= 5).astype(np.int64)

        # Compute labels (vectorized per snapshot)
        futureSales14d = []
        stockout14d = []

        for snap_norm, inv_qty in zip(snapshotNorms, inventoryQty):
            futureStart = snap_norm + timedelta(days=1)
            futureEnd = snap_norm + timedelta(days=14)

            mask = (
                (prodStats['date'] >= futureStart) &
                (prodStats['date'] <= futureEnd)
            )
            future_sales = int(prodStats[mask]['purchases'].sum())
            futureSales14d.append(future_sales)
            stockout14d.append(1 if future_sales > inv_qty else 0)

        futureSales14d = np.array(futureSales14d)
        stockout14d = np.array(stockout14d)

        # Build rows from vectorized data
        for i, snap_norm in enumerate(snapshotNorms):
            featureRow = {
                'productId': productId,
                'storeId': storeId,
                'snapshotDate': snap_norm.strftime('%Y-%m-%d'),
                'sales7d': int(sales7d[i]),
                'sales14d': int(sales14d[i]),
                'sales30d': int(sales30d[i]),
                'sales7dPerDay': float(sales7dPerDay[i]),
                'sales30dPerDay': float(sales30dPerDay[i]),
                'salesRatio7To30': float(salesRatio7To30[i]),
                'views7d': int(views7d[i]),
                'views30d': int(views30d[i]),
                'addToCarts7d': int(addToCarts7d[i]),
                'viewToPurchase7d': float(viewToPurchase7d[i]),
                'avgPrice': priceStats['avg'],
                'minPrice': priceStats['min'],
                'maxPrice': priceStats['max'],
                'avgRating': float(avgRating[i]),
                'ratingCount': int(ratingCount[i]),
                'inventoryQty': int(inventoryQty[i]),
                'daysSinceRestock': int(daysSinceRestock[i]),
                'storeViews7d': int(storeViews7d[i]),
                'storePurchases7d': int(storePurchases7d[i]),
                'dayOfWeek': int(dayOfWeek[i]),
                'isWeekend': int(isWeekend[i]),
                'futureSales14d': int(futureSales14d[i]),
                'stockout14d': int(stockout14d[i])
            }
            rows.append(featureRow)

        return rows


class FileFeatureExporter:
    """Export features with advanced batch optimization"""

    def __init__(self):
        self.dataLoader = FileDataLoader()
        self.featureEngineer = FeatureEngineer()

    def exportFeatures(
        self,
        inputFile: str,
        outputCsv: str,
        modelType: str = 'mlp',
        productIds: Optional[List[str]] = None,
        batchSize: int = 200,
        maxWorkers: Optional[int] = None
    ) -> None:
        logger.info(f"Starting feature export from {inputFile} for model: {modelType}")

        if maxWorkers is None:
            maxWorkers = os.cpu_count() or 4
        logger.info(f"Using {maxWorkers} worker processes with batch size {batchSize}")

        # Load and prepare data
        df = self.dataLoader.load_from_file(inputFile)

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

        df['invoice_date'] = pd.to_datetime(df['invoice_date'], errors='coerce').dt.tz_localize(None)
        df['date'] = df['invoice_date'].dt.normalize()
        df['product_id'] = df['stock_code']
        df['store_id'] = df['country']
        # Don't dropNA aggressively on customer_id if using generic sales data, but typically required for UCI
        df = df.dropna(subset=['product_id', 'store_id'])

        logger.info("Pre-computing global statistics...")

        # FIX: Group by [Product, Store, Date] instead of [Product, Date]
        # This prevents sales from Store A being attributed to Store B
        productStats = (
            df.groupby(['product_id', 'store_id', 'date'])
              .agg(
                  views=('invoice_no', 'nunique'),
                  purchases=('quantity', 'sum'),
                  addToCarts=('invoice_no', 'nunique'),
                  revenue=('unit_price', lambda x: (x * df.loc[x.index, 'quantity']).sum())
              )
              .reset_index()
              .rename(columns={'product_id': 'productId', 'store_id': 'storeId'})
        )
        productStats['date'] = pd.to_datetime(productStats['date']).dt.tz_localize(None).dt.normalize()

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

        variants = (
            df[['product_id', 'unit_price']].drop_duplicates()
              .rename(columns={'product_id': 'productId', 'unit_price': 'price'})
        )
        variants['id'] = variants['productId']

        inventory = (
            df[['product_id', 'quantity', 'invoice_date']]
              .rename(columns={'product_id': 'variantId', 'invoice_date': 'updatedAt'})
              .copy()
        )
        inventory['updatedAt'] = pd.to_datetime(inventory['updatedAt'], errors='coerce').dt.tz_localize(None).dt.normalize()
        inventory['id'] = inventory['variantId']

        reviews = (
            df[['product_id', 'invoice_date']]
              .rename(columns={'product_id': 'productId', 'invoice_date': 'createdAt'})
              .copy()
        )
        reviews['createdAt'] = pd.to_datetime(reviews['createdAt'], errors='coerce').dt.tz_localize(None).dt.normalize()
        reviews['rating'] = 5
        reviews['id'] = reviews['productId']

        # Get unique Product-Store combinations
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

        logger.info(f"Processing {len(products)} product-store combinations in batches of {batchSize}")

        start_ts = pd.to_datetime(df['date'].min()).normalize()
        end_ts = pd.to_datetime(df['date'].max()).normalize()
        snapshotDates = pd.date_range(start=start_ts, end=end_ts, freq='D')
        logger.info(f"Generating features for {len(snapshotDates)} days")

        # Create batches of (productId, storeId)
        productList = [(row['id'], row['storeId']) for _, row in products.iterrows()]
        batches = [productList[i:i+batchSize] for i in range(0, len(productList), batchSize)]

        logger.info(f"Processing {len(batches)} batches with {maxWorkers} workers")

        # Process batches with multiprocessing
        allRows: List[Dict[str, Any]] = []

        with ProcessPoolExecutor(max_workers=maxWorkers) as executor:
            futures = {
                executor.submit(
                    _processBatchStatic,
                    batch=batch,
                    snapshotDates=snapshotDates,
                    productStats=productStats,
                    storeStats=storeStats,
                    variants=variants,
                    inventory=inventory,
                    reviews=reviews,
                    modelType=modelType,
                    globalMinDate=start_ts
                ): idx
                for idx, batch in enumerate(batches)
            }

            with tqdm(total=len(batches), desc="Processing batches") as pbar:
                for future in futures:
                    try:
                        rows = future.result()
                        allRows.extend(rows)
                        pbar.update(1)
                    except Exception as e:
                        logger.error(f"Batch failed: {e}")
                        pbar.update(1)
                        continue

        if not allRows:
            logger.warning("No feature rows generated")
            return

        logger.info("Converting to DataFrame and saving...")
        dfOut = pd.DataFrame(allRows)

        # Column filtering differs by model type
        if modelType == 'mlp':
            columns = [
                'productId', 'storeId', 'snapshotDate',
                *featureConfig.featureColumns,
                'futureSales14d', 'stockout14d'
            ]
            for col in columns:
                if col not in dfOut.columns:
                    dfOut[col] = 0
            dfOut = dfOut[columns]
            dfOut['snapshotDate'] = pd.to_datetime(dfOut['snapshotDate'], errors='coerce').dt.normalize().dt.strftime('%Y-%m-%d')
        else:
            # TFT Columns matching the requested format
            logger.info("Ensuring time_idx continuity for TFT...")
            tft_columns = [
                'date', 'productId', 'storeId', 'purchases', 'views', 'revenue',
                'inventoryQty', 'time_idx', 'dayOfWeek', 'dayOfMonth', 'month',
                'isWeekend', 'log_purchases', 'log_views'
            ]

            # Ensure columns exist (inventoryQty is calculated, views/revenue from merge)
            for col in tft_columns:
                if col not in dfOut.columns:
                    dfOut[col] = 0.0 if 'log' in col or col in ['dayOfWeek'] else 0

            dfOut = dfOut[tft_columns]
            if 'time_idx' in dfOut.columns:
                dfOut = dfOut.sort_values(['storeId', 'productId', 'time_idx'])

        dfOut.to_csv(outputCsv, index=False)

        logger.info(f"Successfully exported {len(dfOut)} rows to {outputCsv}")
        self._logStatistics(dfOut, modelType)

    def _logStatistics(self, df: pd.DataFrame, modelType: str) -> None:
        logger.info("Dataset Statistics:")
        logger.info(f"  Total rows: {len(df)}")
        logger.info(f"  Unique products: {df['productId'].nunique()}")

        if modelType == 'mlp':
            logger.info(f"  Date range: {df['snapshotDate'].min()} to {df['snapshotDate'].max()}")
            if 'stockout14d' in df.columns:
                stockoutRate = df['stockout14d'].mean()
                logger.info(f"  Stockout rate: {stockoutRate:.2%}")
        else:
            logger.info(f"  Time idx range: {df['time_idx'].min()} to {df['time_idx'].max()}")
            logger.info(f"  Features: {list(df.columns)}")


def _processBatchStatic(
    batch: List[tuple],
    snapshotDates: pd.DatetimeIndex,
    productStats: pd.DataFrame,
    storeStats: pd.DataFrame,
    variants: pd.DataFrame,
    inventory: pd.DataFrame,
    reviews: pd.DataFrame,
    modelType: str,
    globalMinDate: pd.Timestamp
) -> List[Dict[str, Any]]:
    """Static function for multiprocessing (pickled execution)"""
    featureEngineer = FeatureEngineer()
    processor = BatchFeatureProcessor(featureEngineer)
    return processor.processBatch(
        batchProducts=batch,
        snapshotDates=snapshotDates,
        productStats=productStats,
        storeStats=storeStats,
        variants=variants,
        inventory=inventory,
        reviews=reviews,
        modelType=modelType,
        globalMinDate=globalMinDate
    )


def main():
    parser = argparse.ArgumentParser(description='Export features for model training')
    parser.add_argument('--input', required=True, help='Input data file path')
    parser.add_argument('--out', default='data/features.csv', help='Output CSV path')
    parser.add_argument('--model', default='mlp', choices=['mlp', 'tft'], help='Model type (mlp or tft)')
    parser.add_argument('--products', nargs='*', help='Optional product IDs to filter')
    parser.add_argument('--batch-size', type=int, default=200, help='Batch size for processing')
    parser.add_argument('--workers', type=int, default=None, help='Number of worker processes')
    args = parser.parse_args()

    exporter = FileFeatureExporter()
    exporter.exportFeatures(
        inputFile=args.input,
        outputCsv=args.out,
        modelType=args.model,
        productIds=args.products,
        batchSize=args.batch_size,
        maxWorkers=args.workers
    )


if __name__ == '__main__':
    main()
