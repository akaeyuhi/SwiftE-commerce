"""
Feature engineering with optimized computations and vectorization
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Optional
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
            ts[col] = ts[col].astype(np.int64)
        ts['revenue'] = ts['revenue'].astype(np.float64)

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
        """Build a single feature row for given snapshot"""

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
