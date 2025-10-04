"""
Test helper utilities
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any


def generate_time_series_data(
        start_date: str,
        periods: int,
        freq: str = 'D',
        columns: List[str] = None
) -> pd.DataFrame:
    """Generate synthetic time series data"""
    dates = pd.date_range(start_date, periods=periods, freq=freq)

    if columns is None:
        columns = ['value']

    data = {'date': dates}
    for col in columns:
        if col != 'date':
            data[col] = np.random.randn(periods)

    return pd.DataFrame(data)


def assert_dataframe_schema(
        df: pd.DataFrame,
        required_columns: List[str],
        dtypes: Dict[str, Any] = None
):
    """Assert DataFrame has required schema"""
    for col in required_columns:
        assert col in df.columns, f"Missing column: {col}"

    if dtypes:
        for col, dtype in dtypes.items():
            assert df[col].dtype == dtype, f"Column {col} has wrong dtype"


def create_mock_prediction_response(
        n_predictions: int = 10,
        score_range: tuple = (0.0, 1.0)
) -> List[Dict[str, Any]]:
    """Create mock prediction responses"""
    responses = []
    for i in range(n_predictions):
        score = np.random.uniform(*score_range)
        label = 'high' if score > 0.7 else ('medium' if score > 0.4 else 'low')

        responses.append({
            'index': i,
            'score': float(score),
            'label': label,
            'productId': f'prod-{i}',
            'storeId': f'store-{i % 3}'
        })

    return responses


def assert_prediction_valid(prediction: Dict[str, Any]):
    """Assert prediction has valid structure"""
    assert 'score' in prediction
    assert 'label' in prediction
    assert 0 <= prediction['score'] <= 1
    assert prediction['label'] in ['high', 'medium', 'low']


def compare_dataframes(
        df1: pd.DataFrame,
        df2: pd.DataFrame,
        check_exact: bool = False
) -> bool:
    """Compare two DataFrames"""
    if check_exact:
        return df1.equals(df2)
    else:
        return (
                set(df1.columns) == set(df2.columns) and
                len(df1) == len(df2)
        )
