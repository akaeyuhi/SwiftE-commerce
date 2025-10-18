"""
Unit tests for FeatureEngineer
"""
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from predictor.feature_engineer import FeatureEngineer


class TestFeatureEngineer:
    """Test feature engineering functionality"""

    @pytest.fixture
    def engineer(self):
        """Create FeatureEngineer instance"""
        return FeatureEngineer()

    @pytest.fixture
    def date_index(self):
        """Sample date index"""
        return pd.date_range('2025-01-01', periods=30, freq='D')

    def test_build_timeseries_table_empty(self, engineer, date_index):
        """Test building timeseries with empty data"""
        empty_df = pd.DataFrame()
        result = engineer.buildTimeseriesTable(empty_df, date_index)

        assert len(result) == 30
        assert (result['views'] == 0).all()
        assert (result['purchases'] == 0).all()

    def test_build_timeseries_table_with_data(self, engineer, date_index):
        """Test building timeseries with data"""
        data = pd.DataFrame({
            'date': date_index[:10],
            'views': np.random.randint(10, 100, 10),
            'purchases': np.random.randint(1, 10, 10),
            'addToCarts': np.random.randint(5, 50, 10),
            'revenue': np.random.uniform(100, 500, 10)
        })

        result = engineer.buildTimeseriesTable(data, date_index)

        assert len(result) == 30
        # First 10 days should have data
        assert (result.iloc[:10]['views'] > 0).all()
        # Last 20 days should be zero-filled
        assert (result.iloc[10:]['views'] == 0).all()

    def test_compute_rolling_windows(self, engineer, date_index):
        """Test rolling window computation"""
        ts = pd.DataFrame({
            'views': np.ones(30) * 10,
            'purchases': np.ones(30) * 2,
            'addToCarts': np.ones(30) * 5,
            'revenue': np.ones(30) * 100
        }, index=date_index)

        windows = engineer.computeRollingWindows(ts)

        assert '7d' in windows
        assert '14d' in windows
        assert '30d' in windows

        # Check 7-day window
        assert windows['7d'].iloc[6]['purchases'] == 14  # 2 * 7
        # Check 30-day window
        assert windows['30d'].iloc[29]['purchases'] == 60  # 2 * 30

    def test_compute_inventory_by_date_empty(self, engineer, date_index):
        """Test inventory computation with empty data"""
        empty_df = pd.DataFrame()
        result = engineer.computeInventoryByDate(empty_df, [], date_index)

        assert len(result) == 30
        assert (result == 0).all()

    def test_compute_inventory_by_date_with_updates(self, engineer, date_index):
        """Test inventory computation with updates"""
        inventory = pd.DataFrame({
            'variantId': ['var-1', 'var-1', 'var-2'],
            'quantity': [100, 150, 200],
            'updatedAt': [
                date_index[0],
                date_index[10],
                date_index[5]
            ]
        })

        result = engineer.computeInventoryByDate(
            inventory,
            ['var-1', 'var-2'],
            date_index
        )

        assert len(result) == 30
        # First 5 days: var-1 = 100
        assert result.iloc[0] == 100
        # Days 5-9: var-1 = 100, var-2 = 200
        assert result.iloc[5] == 300
        # Days 10+: var-1 = 150, var-2 = 200
        assert result.iloc[10] == 350

    def test_compute_reviews_cumulative_empty(self, engineer, date_index):
        """Test cumulative reviews with empty data"""
        empty_df = pd.DataFrame()
        count, avg = engineer.computeReviewsCumulative(
            empty_df,
            'prod-1',
            date_index
        )

        assert len(count) == 30
        assert (count == 0).all()
        assert (avg == 0).all()

    def test_compute_reviews_cumulative(self, engineer, date_index):
        """Test cumulative reviews computation"""
        reviews = pd.DataFrame({
            'productId': ['prod-1'] * 10,
            'rating': [5, 4, 5, 3, 4, 5, 5, 4, 3, 5],
            'createdAt': date_index[:10]
        })

        count, avg = engineer.computeReviewsCumulative(
            reviews,
            'prod-1',
            date_index
        )

        assert len(count) == 30
        assert count.iloc[0] == 1  # First review
        assert count.iloc[9] == 10  # All reviews
        assert avg.iloc[9] == pytest.approx(4.3, 0.1)  # Average of all

    def test_build_feature_row(self, engineer):
        """Test building a single feature row"""
        date_index = pd.date_range('2025-01-01', periods=30, freq='D')
        snapshot_date = datetime(2025, 1, 15)

        # Create mock rolling windows
        ts = pd.DataFrame({
            'views': [100] * 30,
            'purchases': [10] * 30,
            'addToCarts': [20] * 30,
            'revenue': [500] * 30
        }, index=date_index)

        rolling_windows = {
            '7d': ts.rolling(7, min_periods=1).sum(),
            '14d': ts.rolling(14, min_periods=1).sum(),
            '30d': ts.rolling(30, min_periods=1).sum()
        }

        store_ts = pd.DataFrame({
            'views': [1000] * 30,
            'purchases': [100] * 30,
            'addToCarts': [200] * 30,
            'revenue': [5000] * 30,
            'checkouts': [150] * 30
        }, index=date_index)

        price_stats = {'avg': 35.99, 'min': 29.99, 'max': 39.99}
        inventory_by_date = pd.Series([150] * 30, index=date_index, dtype=np.int64)
        reviews_count = pd.Series([25] * 30, index=date_index, dtype=np.int64)
        reviews_avg = pd.Series([4.5] * 30, index=date_index, dtype=np.float64)

        result = engineer.buildFeatureRow(
            productId='prod-1',
            storeId='store-1',
            snapshotDate=snapshot_date,
            dateIndex=14,
            rollingWindows=rolling_windows,
            storeTs=store_ts,
            priceStats=price_stats,
            inventoryByDate=inventory_by_date,
            reviewsCount=reviews_count,
            reviewsAvg=reviews_avg,
            lastRestockDate=datetime(2025, 1, 10)
        )

        assert result['productId'] == 'prod-1'
        assert result['storeId'] == 'store-1'
        assert result['sales7d'] == 70  # 10 * 7 days
        assert result['avgPrice'] == 35.99
        assert result['inventoryQty'] == 150
        assert result['avgRating'] == 4.5
        assert result['dayOfWeek'] == snapshot_date.weekday()

    def test_compute_label(self, engineer, sample_product_stats):
        """Test label computation"""
        snapshot_date = datetime(2025, 1, 15)
        inventory_qty = 50

        result = engineer.computeLabel(
            productId='prod-1',
            snapshotDate=snapshot_date,
            inventoryQty=inventory_qty,
            productStatsDf=sample_product_stats
        )

        assert 'futureSales14d' in result
        assert 'stockout14d' in result
        assert result['stockout14d'] in [0, 1]
