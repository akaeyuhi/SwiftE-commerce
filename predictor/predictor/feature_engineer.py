"""
Feature engineering with optimized computations and vectorization
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np

from .config import featureConfig

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Efficient feature engineering with vectorized operations"""

    def __init__(self):
        self.config = featureConfig

    def buildTimeseriesTable(
        self,
        stats: pd.DataFrame,
        dateIndex: pd.DatetimeIndex
    ) -> pd.DataFrame:
        """Create daily timeseries with zero-filling"""
        if stats.empty:
            return pd.DataFrame({
                'views': 0,
                'purchases': 0,
                'addToCarts': 0,
                'revenue': 0.0
            }, index=dateIndex)

        ts = stats.set_index('date').reindex(dateIndex, fill_value=0)

        # Ensure correct types
        for col in ['views', 'purchases', 'addToCarts']:
            if col in ts.columns:
                ts[col] = ts[col].astype(np.int64)
            else:
                ts[col] = 0

        if 'revenue' in ts.columns:
            ts['revenue'] = ts['revenue'].astype(np.float64)
        else:
            ts['revenue'] = 0.0

        return ts[['views', 'purchases', 'addToCarts', 'revenue']]

    def computeInventoryByDate(
        self,
        invDf: pd.DataFrame,
        variantIds: list[str],
        dateIndex: pd.DatetimeIndex
    ) -> pd.Series:
        """
        Compute inventory snapshot for each date using merge_asof
        Optimized version with better performance
        """
        if invDf.empty or not variantIds:
            return pd.Series(0, index=dateIndex, dtype=np.int64)

        # Filter to relevant variants
        invSub = invDf[invDf['variantId'].isin(variantIds)].copy()
        if invSub.empty:
            return pd.Series(0, index=dateIndex, dtype=np.int64)

        invSub = invSub.sort_values('updatedAt')

        # Prepare snapshot times
        snapshotDf = pd.DataFrame({'snapshotTime': dateIndex})

        # Compute total quantity by date
        totalQty = pd.Series(0, index=dateIndex, dtype=np.int64)

        # Process per variant (vectorized within each variant)
        for variantId in invSub['variantId'].unique():
            variantRows = invSub[invSub['variantId'] == variantId].copy()

            # If this came from UCI raw data (negative/positive quantities), we need cumulative sum
            # But if it came from your DB snapshots (absolute quantity), we use asof
            # Assuming absolute snapshots here based on "updatedAt" column name context

            variantRows = variantRows[['updatedAt', 'quantity']].drop_duplicates('updatedAt')
            variantRows = variantRows.sort_values('updatedAt')
            variantRows = variantRows.rename(columns={'updatedAt': 'ts', 'quantity': 'qty'})

            # Merge asof for this variant
            merged = pd.merge_asof(
                snapshotDf.rename(columns={'snapshotTime': 'ts'}),
                variantRows,
                on='ts',
                direction='backward'
            )

            merged['qty'] = merged['qty'].fillna(0).astype(np.int64)
            # Ensure inventory doesn't go below zero if data is messy
            merged['qty'] = merged['qty'].clip(lower=0)
            totalQty += merged['qty'].values

        return totalQty

    def computeReviewsCumulative(
        self,
        reviewsDf: pd.DataFrame,
        productId: str,
        dateIndex: pd.DatetimeIndex
    ) -> tuple[pd.Series, pd.Series]:
        """Compute cumulative review count and average rating"""
        if reviewsDf.empty or productId not in reviewsDf['productId'].unique():
            return (
                pd.Series(0, index=dateIndex, dtype=np.int64),
                pd.Series(0.0, index=dateIndex, dtype=np.float64)
            )

        reviews = reviewsDf[reviewsDf['productId'] == productId].copy()
        reviews['date'] = reviews['createdAt'].dt.date

        # Aggregate by date
        agg = reviews.groupby('date')['rating'].agg(['count', 'sum']).sort_index()
        agg.index = pd.to_datetime(agg.index)

        # Reindex to full date range
        agg = agg.reindex(dateIndex, fill_value=0)

        # Cumulative sums
        cumulativeCount = agg['count'].cumsum().astype(np.int64)
        cumulativeSum = agg['sum'].cumsum()
        cumulativeAvg = (cumulativeSum / cumulativeCount.replace(0, np.nan)).fillna(0.0)

        return cumulativeCount, cumulativeAvg

    def computeRollingWindows(
        self,
        ts: pd.DataFrame
    ) -> dict[str, pd.DataFrame]:
        """Compute rolling window aggregations"""
        windows = {
            '7d': ts.rolling(window=self.config.window7d, min_periods=1).sum(),
            '14d': ts.rolling(window=self.config.window14d, min_periods=1).sum(),
            '30d': ts.rolling(window=self.config.window30d, min_periods=1).sum(),
        }
        return windows

    def buildFeatureRow(
        self,
        productId: str,
        storeId: Optional[str],
        snapshotDate: datetime,
        dateIndex: int,
        rollingWindows: dict[str, pd.DataFrame],
        storeTs: pd.DataFrame,
        priceStats: dict[str, float],
        inventoryByDate: pd.Series,
        reviewsCount: pd.Series,
        reviewsAvg: pd.Series,
        lastRestockDate: Optional[datetime]
    ) -> dict[str, any]:
        """Build a single feature row for given snapshot (MLP logic)"""

        ro7 = rollingWindows['7d'].iloc[dateIndex]
        ro14 = rollingWindows['14d'].iloc[dateIndex]
        ro30 = rollingWindows['30d'].iloc[dateIndex]

        # Sales metrics
        sales7d = int(ro7['purchases'])
        sales14d = int(ro14['purchases'])
        sales30d = int(ro30['purchases'])
        views7d = int(ro7['views'])
        views30d = int(ro30['views'])
        addToCarts7d = int(ro7['addToCarts'])

        # Derived metrics
        sales7dPerDay = sales7d / 7.0
        sales30dPerDay = sales30d / 30.0
        salesRatio7To30 = sales7d / sales30d if sales30d > 0 else 0.0
        viewToPurchase7d = sales7d / views7d if views7d > 0 else 0.0

        # Store metrics
        storeViews7d = int(storeTs.iloc[dateIndex]['views']) if not storeTs.empty else 0
        storePurchases7d = int(storeTs.iloc[dateIndex]['purchases']) if not storeTs.empty else 0

        # Inventory
        inventoryQty = int(inventoryByDate.iloc[dateIndex])

        # Days since restock (relative to snapshot date, not current)
        if lastRestockDate and lastRestockDate <= snapshotDate:
            daysSinceRestock = (snapshotDate.date() - lastRestockDate.date()).days
        else:
            daysSinceRestock = 365  # Default for unknown

        # Temporal features
        dayOfWeek = snapshotDate.weekday()
        isWeekend = 1 if dayOfWeek >= 5 else 0

        # Reviews
        avgRating = float(reviewsAvg.iloc[dateIndex])
        ratingCount = int(reviewsCount.iloc[dateIndex])

        return {
            'productId': productId,
            'storeId': storeId,
            'snapshotDate': snapshotDate.strftime('%Y-%m-%d'),
            # Features (must match featureConfig.featureColumns order)
            'sales7d': sales7d,
            'sales14d': sales14d,
            'sales30d': sales30d,
            'sales7dPerDay': sales7dPerDay,
            'sales30dPerDay': sales30dPerDay,
            'salesRatio7To30': salesRatio7To30,
            'views7d': views7d,
            'views30d': views30d,
            'addToCarts7d': addToCarts7d,
            'viewToPurchase7d': viewToPurchase7d,
            'avgPrice': priceStats['avg'],
            'minPrice': priceStats['min'],
            'maxPrice': priceStats['max'],
            'avgRating': avgRating,
            'ratingCount': ratingCount,
            'inventoryQty': inventoryQty,
            'daysSinceRestock': daysSinceRestock,
            'storeViews7d': storeViews7d,
            'storePurchases7d': storePurchases7d,
            'dayOfWeek': dayOfWeek,
            'isWeekend': isWeekend,
        }

    def computeLabel(
        self,
        productId: str,
        snapshotDate: datetime,
        inventoryQty: int,
        productStatsDf: pd.DataFrame
    ) -> dict[str, any]:
        """Compute stockout label for next 14 days"""
        futureStart = snapshotDate + timedelta(days=1)
        futureEnd = snapshotDate + timedelta(days=14)

        # Sum purchases in future window
        mask = (
            (productStatsDf['productId'] == productId) &
            (productStatsDf['date'] >= futureStart) &
            (productStatsDf['date'] <= futureEnd)
        )

        futureSales = int(productStatsDf[mask]['purchases'].sum())
        stockout14d = 1 if futureSales > inventoryQty else 0

        return {
            'futureSales14d': futureSales,
            'stockout14d': stockout14d
        }

    def prepare_time_series_data(
        self,
        product_stats: pd.DataFrame,
        inventory_df: pd.DataFrame,
        product_ids: list[str],
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """
        Generates a full time-series DataFrame for all products for TFT training.
        Matches columns: date, productId, storeId, purchases, views, revenue,
                         inventoryQty, time_idx, dayOfWeek, dayOfMonth, month,
                         isWeekend, log_purchases, log_views
        """
        logger.info("Generating time-series data for TFT...")

        # 1. Create full date range index
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')

        # 2. Build template: All Products x All Dates
        # This ensures we have no gaps in time (critical for TFT)
        template_data = []

        # Optimization: Create a dataframe directly from product/store pairs
        # Assuming product_ids contains tuples or we extract them from stats
        # If product_ids is just a list of IDs, we assume single store or need store mapping

        # Extract unique product-store combinations from stats to be safe
        unique_pairs = product_stats[['productId', 'storeId']].drop_duplicates()

        if unique_pairs.empty:
             # Fallback if stats empty but IDs provided (unlikely to be useful but safe)
             unique_pairs = pd.DataFrame({'productId': product_ids, 'storeId': 'unknown'})

        # Vectorized template creation
        # Repeat date range for each product-store pair
        n_dates = len(date_range)
        n_pairs = len(unique_pairs)

        dates_tiled = np.tile(date_range, n_pairs)
        pids_repeated = np.repeat(unique_pairs['productId'].values, n_dates)
        sids_repeated = np.repeat(unique_pairs['storeId'].values, n_dates)

        df_ts = pd.DataFrame({
            'date': dates_tiled,
            'productId': pids_repeated,
            'storeId': sids_repeated
        })

        # 3. Merge Sales/Views Data
        if not product_stats.empty:
            product_stats['date'] = pd.to_datetime(product_stats['date'])
            # Aggregate if multiple entries per day (defensive)
            stats_agg = product_stats.groupby(['productId', 'storeId', 'date']).agg({
                'purchases': 'sum',
                'views': 'sum',
                'revenue': 'sum'
            }).reset_index()

            df_ts = pd.merge(df_ts, stats_agg, on=['productId', 'storeId', 'date'], how='left')

        # Fill missing daily stats with 0
        fill_cols = ['purchases', 'views', 'revenue']
        for col in fill_cols:
            if col not in df_ts.columns:
                df_ts[col] = 0.0
            df_ts[col] = df_ts[col].fillna(0.0)

        # 4. Merge Inventory Data
        if not inventory_df.empty:
            inv_clean = inventory_df.rename(columns={'updatedAt': 'date'}).copy()
            inv_clean['date'] = pd.to_datetime(inv_clean['date']).dt.floor('D')
            # Ensure we have storeId or map it (assuming inventory variantId maps to productId)
            # If inventory doesn't have storeId, this merge logic needs to be adjusted based on your schema
            # Assuming inventory tracks by productId (variantId) here for simplicity of the example

            # We use the helper to merge properly with forward fill logic
            df_ts = self._merge_inventory_state(df_ts, inv_clean)
        else:
            df_ts['inventoryQty'] = 0.0

        # 5. Add Temporal Features (Vectorized)
        # Cast to float immediately to satisfy TFT requirements
        df_ts['dayOfWeek'] = df_ts['date'].dt.dayofweek.astype(float)
        df_ts['dayOfMonth'] = df_ts['date'].dt.day.astype(float)
        df_ts['month'] = df_ts['date'].dt.month.astype(float)
        df_ts['isWeekend'] = (df_ts['dayOfWeek'] >= 5).astype(float)

        # 6. Add Time Index (Critical for TFT)
        # Calculate global min date once
        global_min_date = df_ts['date'].min()
        df_ts['time_idx'] = (df_ts['date'] - global_min_date).dt.days

        # 7. Add Log-transformed features (helps optimization)
        # Clip negative values to 0 to prevent errors
        df_ts['log_views'] = np.log1p(df_ts['views'].clip(lower=0))
        df_ts['log_purchases'] = np.log1p(df_ts['purchases'].clip(lower=0))

        # 8. Final Column Ordering and Typing
        final_cols = [
            'date', 'productId', 'storeId', 'purchases', 'views', 'revenue',
            'inventoryQty', 'time_idx', 'dayOfWeek', 'dayOfMonth', 'month',
            'isWeekend', 'log_purchases', 'log_views'
        ]

        # Ensure all are present
        for col in final_cols:
            if col not in df_ts.columns:
                df_ts[col] = 0.0

        logger.info(f"Prepared TimeSeries with {len(df_ts)} rows.")
        return df_ts[final_cols]

    def _merge_inventory_state(self, ts_df: pd.DataFrame, inv_updates: pd.DataFrame) -> pd.DataFrame:
        """
        Helper to merge inventory state properly using asof merge.
        This assumes inv_updates has snapshot values (quantity at time t).
        We forward fill this value until the next update.
        """
        ts_df = ts_df.sort_values('date')
        inv_updates = inv_updates.sort_values('date')

        # Ensure join keys are string for safety
        ts_df['productId'] = ts_df['productId'].astype(str)
        # Assuming inventory variantId maps to productId 1:1 for this purpose
        inv_updates['variantId'] = inv_updates['variantId'].astype(str)

        merged_list = []

        # Process by product group (inventory is per product)
        # Note: Inventory might also be per store, but usually tracked per SKU (variantId)
        unique_pids = ts_df['productId'].unique()

        for pid in unique_pids:
            ts_sub = ts_df[ts_df['productId'] == pid].copy()
            inv_sub = inv_updates[inv_updates['variantId'] == pid].copy()

            if inv_sub.empty:
                ts_sub['inventoryQty'] = 0.0
            else:
                # Merge asof: For every date in ts_sub, find the latest inventory record on or before that date
                m = pd.merge_asof(
                    ts_sub,
                    inv_sub[['date', 'quantity']],
                    on='date',
                    direction='backward'
                )
                # Fill any NaNs at the start (before first inventory record) with 0 or first known value
                m['inventoryQty'] = m['quantity'].fillna(method='ffill').fillna(0.0)
                m = m.drop(columns=['quantity'])
                ts_sub = m

            merged_list.append(ts_sub)

        if not merged_list:
             return ts_df

        return pd.concat(merged_list)
