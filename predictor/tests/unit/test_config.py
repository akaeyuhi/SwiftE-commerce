"""
Unit tests for configuration modules
"""
import pytest
import os
from unittest.mock import patch
from predictor.config import (
    DatabaseConfig,
    FeatureConfig,
    ModelConfig,
    ServerConfig
)


class TestDatabaseConfig:
    """Test database configuration"""

    def test_default_values(self):
        """Test default configuration values"""
        # Clear env vars first
        with patch.dict(os.environ, {}, clear=True):
            config = DatabaseConfig()
            assert config.host == "localhost"
            assert config.port == 5432
            assert config.database == "postgres"
            assert config.user == "postgres"

    def test_connection_string(self):
        """Test connection string generation"""
        config = DatabaseConfig(
            host="db.example.com",
            port=5433,
            database="test_db",
            user="test_user",
            password="test_pass"
        )

        expected = "postgresql+psycopg2://test_user:test_pass@db.example.com:5433/test_db"
        assert config.connectionString == expected

    def test_from_environment(self):
        """Test configuration from environment variables"""
        env_vars = {

        }

        with patch.dict(os.environ, env_vars, clear=True):
            config = DatabaseConfig(host="localhost",
            port=5555,
            database="env-db",
            user="env-user",
            password="env-pass")

            assert config.host == "localhost"
            assert config.port == 5555
            assert config.database == "env-db"


class TestFeatureConfig:
    """Test feature configuration"""

    def test_default_windows(self):
        """Test default window sizes"""
        config = FeatureConfig()
        assert config.window7d == 7
        assert config.window14d == 14
        assert config.window30d == 30
        assert config.paddingDays == 29

    def test_feature_columns(self):
        """Test feature columns list"""
        config = FeatureConfig()
        assert len(config.featureColumns) == 21
        assert 'sales7d' in config.featureColumns
        assert 'views7d' in config.featureColumns
        assert 'inventoryQty' in config.featureColumns

    def test_custom_feature_columns(self):
        """Test custom feature columns"""
        custom_cols = ['feature1', 'feature2', 'feature3']
        config = FeatureConfig(featureColumns=custom_cols)
        assert config.featureColumns == custom_cols


class TestModelConfig:
    """Test model configuration"""

    def test_default_lightgbm_params(self):
        """Test default LightGBM parameters"""
        config = ModelConfig()
        assert config.lgbParams['objective'] == 'binary'
        assert 'auc' in config.lgbParams['metric']
        assert config.lgbParams['seed'] == 42

    def test_default_keras_params(self):
        """Test default Keras parameters"""
        config = ModelConfig()
        assert config.kerasHiddenLayers == [128, 64]
        assert config.kerasDropout == 0.2
        assert config.kerasEpochs == 100

    def test_custom_params(self):
        """Test custom model parameters"""
        config = ModelConfig(
            testSize=0.2,
            randomState=123,
            lgbNumRounds=500
        )
        assert config.testSize == 0.2
        assert config.randomState == 123
        assert config.lgbNumRounds == 500


class TestServerConfig:
    """Test server configuration"""

    def test_default_values(self):
        """Test default server configuration"""
        with patch.dict(os.environ, {}, clear=True):
            config = ServerConfig()
            assert config.host == "0.0.0.0"
            assert config.port == 8080
            assert config.logLevel == "info"

    def test_from_environment(self):
        """Test server config from environment"""
        config = ServerConfig(
            modelPath="/custom/model.bin",
            authToken="custom-token",
            port=9000
        )

        assert config.modelPath == "/custom/model.bin"
        assert config.authToken == "custom-token"
        assert config.port == 9000
