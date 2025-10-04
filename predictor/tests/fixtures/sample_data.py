"""
Reusable sample data fixtures
"""
from typing import Dict, Any, List

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


class SampleDataFactory:
    """Factory for generating sample data"""

    @staticmethod
    def create_products(n: int = 10) -> pd.DataFrame:
        """Create sample products"""
        return pd.DataFrame({
            'id': [f'prod-{i}' for i in range(n)],
            'storeId': [f'store-{i % 3}' for i in range(n)],
            'name': [f'Product {i}' for i in range(n)],
            'category': np.random.choice(['Electronics', 'Clothing', 'Home'], n)
        })

    @staticmethod
    def create_daily_stats(
            product_ids: List[str],
            start_date: str,
            days: int
    ) -> pd.DataFrame:
        """Create sample daily stats"""
        dates = pd.date_range(start_date, periods=days, freq='D')
        data = []

        for product_id in product_ids:
            for date in dates:
                data.append({
                    'productId': product_id,
                    'date': date,
                    'views': np.random.randint(50, 500),
                    'purchases': np.random.randint(5, 50),
                    'addToCarts': np.random.randint(10, 100),
                    'revenue': np.random.uniform(100, 2000)
                })

        return pd.DataFrame(data)

    @staticmethod
    def create_feature_vector(
            product_id: str = 'prod-1',
            **overrides
    ) -> Dict[str, Any]:
        """Create sample feature vector"""
        features = {
            'productId': product_id,
            'sales7d': 50,
            'sales14d': 100,
            'sales30d': 250,
            'sales7dPerDay': 7.14,
            'sales30dPerDay': 8.33,
            'salesRatio7To30': 0.2,
            'views7d': 500,
            'views30d': 2000,
            'addToCarts7d': 100,
            'viewToPurchase7d': 0.1,
            'avgPrice': 35.99,
            'minPrice': 29.99,
            'maxPrice': 39.99,
            'avgRating': 4.5,
            'ratingCount': 25,
            'inventoryQty': 150,
            'daysSinceRestock': 5,
            'storeViews7d': 5000,
            'storePurchases7d': 500,
            'dayOfWeek': 3,
            'isWeekend': 0
        }

        features.update(overrides)
        return features
