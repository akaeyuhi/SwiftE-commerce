"""
Configuration management for predictor system
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class DatabaseConfig:
    """Database connection configuration"""
    host: str = os.getenv("PGHOST", "localhost")
    port: int = int(os.getenv("PGPORT", "5432"))
    database: str = os.getenv("PGDATABASE", "postgres")
    user: str = os.getenv("PGUSER", "postgres")
    password: str = os.getenv("PGPASSWORD", "")

    @property
    def connectionString(self) -> str:
        """Get SQLAlchemy connection string"""
        return f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


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


@dataclass
class ServerConfig:
    """Predictor server configuration"""
    modelPath: str = os.getenv("MODEL_PATH", "./model/model.bin")
    scalerPath: str = os.getenv("SCALER_PATH", "./model/scaler.pkl")
    modelType: Optional[str] = os.getenv("MODEL_TYPE")
    authToken: Optional[str] = os.getenv("PREDICTOR_AUTH_TOKEN")
    modelVersion: str = os.getenv("MODEL_VERSION", "v1.0")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8080"))
    logLevel: str = os.getenv("LOG_LEVEL", "info")


# Global config instances
dbConfig = DatabaseConfig()
featureConfig = FeatureConfig()
modelConfig = ModelConfig()
serverConfig = ServerConfig()
