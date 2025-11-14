"""
Configuration management for predictor system
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from typing import Optional


class DatabaseConfig:
    """Database configuration"""

    def __init__(
            self,
            host: Optional[str] = None,
            port: Optional[int] = None,
            database: Optional[str] = None,
            user: Optional[str] = None,
            password: Optional[str] = None
    ):
        # Use provided values or fall back to environment or defaults
        self.host = host or os.getenv('PGHOST', 'localhost')
        self.port = port or int(os.getenv('PGPORT', '5432'))
        self.database = database or os.getenv('PGDATABASE', 'postgres')
        self.user = user or os.getenv('PGUSER', 'postgres')
        self.password = password or os.getenv('PGPASSWORD', '')

    @property
    def connectionString(self) -> str:
        """Generate connection string"""
        return f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class ServerConfig:
    """Server configuration"""

    def __init__(
            self,
            modelPath: Optional[str] = None,
            scalerPath: Optional[str] = None,
            modelType: Optional[str] = None,
            authToken: Optional[str] = None,
            modelVersion: Optional[str] = None,
            host: Optional[str] = None,
            port: Optional[int] = None,
            logLevel: Optional[str] = None
    ):
        # Use provided values or fall back to environment or defaults
        self.modelPath = modelPath or os.getenv('MODEL_PATH', './models/model.h5')
        self.scalerPath = scalerPath or os.getenv('SCALER_PATH', './models/scaler.pkl')
        self.modelType = modelType or os.getenv('MODEL_TYPE', 'tensorflow')
        self.authToken = authToken or os.getenv('PREDICTOR_AUTH_TOKEN', '')
        self.modelVersion = modelVersion or os.getenv('MODEL_VERSION', 'v1.0')
        self.host = host or os.getenv('HOST', '0.0.0.0')
        self.port = port or int(os.getenv('PORT', '8080'))
        self.logLevel = logLevel or os.getenv('LOG_LEVEL', 'info')


@dataclass
class FeatureConfig:
    """Feature engineering configuration"""
    # Rolling window sizes (days)
    window7d: int = 7
    window14d: int = 14
    window30d: int = 30

    # Padding for historical data
    paddingDays: int = 29

    # Feature columns (order matters!)
    featureColumns: list[str] = None

    def __post_init__(self):
        if self.featureColumns is None:
            self.featureColumns = [
                "sales7d", "sales14d", "sales30d",
                "sales7dPerDay", "sales30dPerDay", "salesRatio7To30",
                "views7d", "views30d", "addToCarts7d", "viewToPurchase7d",
                "avgPrice", "minPrice", "maxPrice",
                "avgRating", "ratingCount",
                "inventoryQty", "daysSinceRestock",
                "storeViews7d", "storePurchases7d",
                "dayOfWeek", "isWeekend"
            ]


@dataclass
class ModelConfig:
    """Model training configuration"""
    modelType: str = "lightgbm"  # 'lightgbm' or 'keras'
    testSize: float = 0.15
    randomState: int = 42

    # LightGBM params
    lgbParams: dict = None
    lgbNumRounds: int = 1000
    lgbEarlyStopping: int = 50

    # Keras params
    kerasHiddenLayers: list[int] = None
    kerasDropout: float = 0.2
    kerasEpochs: int = 100
    kerasBatchSize: int = 256

    def __post_init__(self):
        if self.lgbParams is None:
            self.lgbParams = {
                "objective": "binary",
                "metric": ["auc", "binary_logloss"],
                "verbosity": -1,
                "boosting": "gbdt",
                "seed": self.randomState,
                "learning_rate": 0.05,
                "num_leaves": 31,
                "feature_fraction": 0.8,
                "bagging_fraction": 0.8,
                "bagging_freq": 5,
            }

        if self.kerasHiddenLayers is None:
            self.kerasHiddenLayers = [128, 64]



# Global config instances
dbConfig = DatabaseConfig()
featureConfig = FeatureConfig()
modelConfig = ModelConfig()
serverConfig = ServerConfig()
