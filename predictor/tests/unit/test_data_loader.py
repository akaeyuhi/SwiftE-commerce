"""
Unit tests for DataLoader
"""
import pytest
import pandas as pd
from unittest.mock import Mock, patch
from predictor.data_loader import DataLoader, getDateRangeWithPadding


class TestDataLoader:
    """Test data loading functionality"""

    @pytest.fixture
    def data_loader(self, mock_db_engine):
        """Create DataLoader instance"""
        return DataLoader(mock_db_engine)

    def test_load_products(self, data_loader, sample_products):
        """Test loading products"""
        with patch('pandas.read_sql_query', return_value=sample_products):
            result = data_loader.loadProducts()
            assert len(result) == 3
            assert 'id' in result.columns
            assert 'storeId' in result.columns

    def test_load_products_filtered(self, data_loader, sample_products):
        """Test loading products with filter"""
        filtered = sample_products[sample_products['id'] == 'prod-1']

        with patch('pandas.read_sql_query', return_value=filtered):
            result = data_loader.loadProducts(productIds=['prod-1'])
            assert len(result) == 1
            assert result.iloc[0]['id'] == 'prod-1'

    def test_load_product_daily_stats(self, data_loader, sample_product_stats):
        """Test loading product daily stats"""
        with patch('pandas.read_sql_query', return_value=sample_product_stats):
            result = data_loader.loadProductDailyStats('2025-01-01', '2025-01-30')
            assert len(result) > 0
            assert 'productId' in result.columns
            assert 'date' in result.columns
            assert pd.api.types.is_datetime64_any_dtype(result['date'])

    def test_load_store_daily_stats(self, data_loader, sample_store_stats):
        """Test loading store daily stats"""
        with patch('pandas.read_sql_query', return_value=sample_store_stats):
            result = data_loader.loadStoreDailyStats('2025-01-01', '2025-01-30')
            assert len(result) > 0
            assert 'storeId' in result.columns
            assert 'checkouts' in result.columns

    def test_load_variants(self, data_loader, sample_variants):
        """Test loading variants"""
        with patch('pandas.read_sql_query', return_value=sample_variants):
            result = data_loader.loadVariants()
            assert len(result) == 3
            assert 'price' in result.columns

    def test_load_inventory(self, data_loader, sample_inventory):
        """Test loading inventory"""
        with patch('pandas.read_sql_query', return_value=sample_inventory):
            result = data_loader.loadInventory()
            assert len(result) > 0
            assert 'quantity' in result.columns
            assert pd.api.types.is_datetime64_any_dtype(result['updatedAt'])

    def test_load_reviews(self, data_loader, sample_reviews):
        """Test loading reviews"""
        with patch('pandas.read_sql_query', return_value=sample_reviews):
            result = data_loader.loadReviews('2025-01-01', '2025-01-30')
            assert len(result) > 0
            assert 'rating' in result.columns
            assert 'reviewDate' in result.columns


class TestDateRangeHelpers:
    """Test date range utility functions"""

    def test_get_date_range_with_padding(self):
        """Test date range padding"""
        start, end = getDateRangeWithPadding('2025-01-30', '2025-02-28', paddingDays=29)
        assert start == '2025-01-01'
        assert end == '2025-02-28'

    def test_default_padding(self):
        """Test default padding (29 days)"""
        start, end = getDateRangeWithPadding('2025-02-01', '2025-02-28')
        assert start == '2025-01-03'
        assert end == '2025-02-28'
