"""
Shared test fixtures and configuration
"""
import sys
import os
from pathlib import Path

# Fix import path - add parent directory
TESTS_DIR = Path(__file__).parent
PREDICTOR_ROOT = TESTS_DIR.parent

# Add to path if not already there
if str(PREDICTOR_ROOT) not in sys.path:
    sys.path.insert(0, str(PREDICTOR_ROOT))

# Verify imports work
try:
    from predictor import config
except ImportError as e:
    print(f"ERROR: Cannot import predictor module")
    print(f"PREDICTOR_ROOT: {PREDICTOR_ROOT}")
    print(f"sys.path: {sys.path}")
    print(f"Directory contents: {list(PREDICTOR_ROOT.iterdir())}")
    raise

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
import tempfile
import os

from predictor.config import (
    DatabaseConfig,
    FeatureConfig,
    ModelConfig,
    ServerConfig
)
from tests.fixtures.mock_models import (
    MockLightGBMModel,
    MockKerasModel,
    MockScaler,
    MockDataLoader,
    MockEngine,
    MockPredictor,
    MockFastAPIClient,
    create_mock_lightgbm_model,
    create_mock_keras_model,
    create_mock_scaler,
    save_mock_model_files
)


# ================================
# Configuration Fixtures
# ================================

@pytest.fixture
def db_config():
    """Test database configuration"""
    return DatabaseConfig(
        host="localhost",
        port=5432,
        database="test_db",
        user="test_user",
        password="test_pass"
    )


@pytest.fixture
def feature_config():
    """Test feature configuration"""
    return FeatureConfig(
        window7d=7,
        window14d=14,
        window30d=30,
        paddingDays=29
    )


@pytest.fixture
def model_config():
    """Test model configuration"""
    return ModelConfig(
        modelType="lightgbm",
        testSize=0.15,
        randomState=42
    )


@pytest.fixture
def server_config(tmp_path):
    """Test server configuration"""
    model_path = tmp_path / "model.bin"
    scaler_path = tmp_path / "scaler.pkl"

    return ServerConfig(
        modelPath=str(model_path),
        scalerPath=str(scaler_path),
        modelType="lightgbm",
        authToken="test-token",
        modelVersion="v1.0-test",
        host="0.0.0.0",
        port=8080
    )


# ================================
# Database Fixtures
# ================================

@pytest.fixture
def in_memory_db():
    """In-memory SQLite database for testing"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    return engine


@pytest.fixture
def mock_db_engine():
    """Mock database engine"""
    mock_engine = Mock()
    mock_connection = Mock()
    mock_engine.connect.return_value = mock_connection
    return mock_engine


# ================================
# Sample Data Fixtures
# ================================

@pytest.fixture
def sample_products():
    """Sample product data"""
    return pd.DataFrame({
        'id': ['prod-1', 'prod-2', 'prod-3'],
        'storeId': ['store-1', 'store-1', 'store-2']
    })


@pytest.fixture
def sample_product_stats():
    """Sample product daily stats"""
    dates = pd.date_range('2025-01-01', periods=30, freq='D')
    data = []

    for product_id in ['prod-1', 'prod-2']:
        for date in dates:
            data.append({
                'productId': product_id,
                'date': date,
                'views': np.random.randint(50, 200),
                'purchases': np.random.randint(5, 20),
                'addToCarts': np.random.randint(10, 40),
                'revenue': np.random.uniform(100, 500)
            })

    return pd.DataFrame(data)


@pytest.fixture
def sample_store_stats():
    """Sample store daily stats"""
    dates = pd.date_range('2025-01-01', periods=30, freq='D')
    data = []

    for store_id in ['store-1', 'store-2']:
        for date in dates:
            data.append({
                'storeId': store_id,
                'date': date,
                'views': np.random.randint(500, 2000),
                'purchases': np.random.randint(50, 200),
                'addToCarts': np.random.randint(100, 400),
                'revenue': np.random.uniform(1000, 5000),
                'checkouts': np.random.randint(80, 300)
            })

    return pd.DataFrame(data)


@pytest.fixture
def sample_variants():
    """Sample product variants"""
    return pd.DataFrame({
        'id': ['var-1', 'var-2', 'var-3'],
        'productId': ['prod-1', 'prod-1', 'prod-2'],
        'price': [29.99, 39.99, 49.99]
    })


@pytest.fixture
def sample_inventory():
    """Sample inventory data"""
    dates = pd.date_range('2025-01-01', periods=30, freq='D')
    data = []

    for variant_id in ['var-1', 'var-2', 'var-3']:
        for i, date in enumerate(dates[::5]):  # Every 5 days
            data.append({
                'id': f'inv-{variant_id}-{i}',
                'variantId': variant_id,
                'quantity': np.random.randint(50, 500),
                'updatedAt': date
            })

    return pd.DataFrame(data)


@pytest.fixture
def sample_reviews():
    """Sample reviews data"""
    dates = pd.date_range('2025-01-01', periods=100, freq='H')
    data = []

    for i, date in enumerate(dates):
        data.append({
            'id': f'review-{i}',
            'productId': np.random.choice(['prod-1', 'prod-2', 'prod-3']),
            'rating': np.random.randint(1, 6),
            'createdAt': date
        })

    return pd.DataFrame(data)


@pytest.fixture
def sample_features():
    """Sample feature vectors"""
    return {
        'sales7d': 50,
        'sales14d': 100,
        'sales30d': 200,
        'sales7dPerDay': 7.14,
        'sales30dPerDay': 6.67,
        'salesRatio7To30': 0.25,
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


@pytest.fixture
def sample_training_data():
    """Sample training dataset"""
    n_samples = 1000
    n_features = 21

    X = np.random.randn(n_samples, n_features)
    y = np.random.randint(0, 2, n_samples)

    return X, y


# ================================
# Model Fixtures
# ================================

@pytest.fixture
def mock_lightgbm_model():
    """Mock LightGBM model"""
    return create_mock_lightgbm_model()


@pytest.fixture
def mock_keras_model():
    """Mock Keras model"""
    return create_mock_keras_model()


@pytest.fixture
def mock_scaler():
    """Mock StandardScaler"""
    return create_mock_scaler()

# ================================
# Temporary Directory Fixtures
# ================================

@pytest.fixture
def temp_data_dir(tmp_path):
    """Temporary data directory"""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return data_dir


@pytest.fixture
def temp_model_dir(tmp_path):
    """Temporary model directory"""
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    return model_dir


# ================================
# API Testing Fixtures
# ================================

@pytest.fixture
def test_client():
    """FastAPI test client"""
    from fastapi.testclient import TestClient
    from predictor.serve import app

    return TestClient(app)


# ================================
# Cleanup
# ================================

@pytest.fixture(autouse=True)
def cleanup_env():
    """Clean up environment variables after each test"""
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)

@pytest.fixture
def mock_data_loader():
    """Mock DataLoader"""
    return MockDataLoader()


@pytest.fixture
def mock_engine():
    """Mock database engine"""
    return MockEngine()


@pytest.fixture
def mock_predictor():
    """Mock predictor service"""
    return MockPredictor()


@pytest.fixture
def mock_api_client():
    """Mock FastAPI test client"""
    return MockFastAPIClient()


@pytest.fixture
def mock_model_files(tmp_path):
    """Create mock model files on disk"""
    return save_mock_model_files(tmp_path / 'models', model_type='lightgbm')


@pytest.fixture
def mock_keras_files(tmp_path):
    """Create mock Keras model files on disk"""
    return save_mock_model_files(tmp_path / 'models', model_type='keras')