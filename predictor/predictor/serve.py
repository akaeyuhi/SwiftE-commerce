"""
FastAPI prediction server with camelCase support

Features:
- Single and batch predictions
- Automatic camelCase ↔ snake_case transformation
- Authentication
- Health checks
- Metrics
"""
from __future__ import annotations
import os
import logging
from typing import Optional, Any
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Header, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import joblib
import numpy as np

from .config import serverConfig
from .case_transformer import CaseTransformer

logging.basicConfig(
    level=serverConfig.logLevel.upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global model and scaler
model = None
scalerInfo = None
modelType = None

app = FastAPI(
    title="Stockout Predictor API",
    description="ML prediction service for stockout forecasting",
    version=serverConfig.modelVersion
)


# ===============================
# Request/Response Models
# ===============================

class PredictRequest(BaseModel):
    """Single prediction request"""
    features: dict[str, Any] = Field(..., description="Feature dictionary")
    productId: Optional[str] = Field(None, description="Product ID")
    storeId: Optional[str] = Field(None, description="Store ID")


class BatchRow(BaseModel):
    """Single row in batch prediction"""
    productId: Optional[str] = None
    storeId: Optional[str] = None
    features: dict[str, Any]


class BatchRequest(BaseModel):
    """Batch prediction request"""
    rows: list[BatchRow] = Field(..., description="List of prediction rows")


class PredictionResponse(BaseModel):
    """Single prediction response"""
    productId: Optional[str] = None
    storeId: Optional[str] = None
    score: float = Field(..., description="Prediction score (0-1)")
    label: str = Field(..., description="Risk label: high/medium/low")
    modelVersion: str = Field(..., description="Model version")


class BatchPredictionResponse(BaseModel):
    """Batch prediction response"""
    results: list[dict[str, Any]]
    modelVersion: str
    processedCount: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    modelType: str
    modelVersion: str
    featuresCount: int


# ===============================
# Startup/Shutdown
# ===============================

@app.on_event("startup")
async def startup():
    """Load model and scaler on startup"""
    global model, scalerInfo, modelType

    logger.info("Loading model and scaler...")

    # Load scaler
    if not Path(serverConfig.scalerPath).exists():
        raise RuntimeError(f"Scaler not found: {serverConfig.scalerPath}")

    scalerInfo = joblib.load(serverConfig.scalerPath)

    if 'columns' not in scalerInfo:
        raise RuntimeError("scaler.pkl missing 'columns' key")

    logger.info(f"Loaded scaler with {len(scalerInfo['columns'])} features")

    # Detect model type
    if serverConfig.modelType:
        modelType = serverConfig.modelType
    else:
        modelPath = Path(serverConfig.modelPath)
        if modelPath.suffix == '.h5' or modelPath.is_dir():
            modelType = 'keras'
        else:
            modelType = 'lightgbm'

    logger.info(f"Detected model type: {modelType}")

    # Load model
    if modelType == 'lightgbm':
        try:
            import lightgbm as lgb
            model = lgb.Booster(model_file=serverConfig.modelPath)
            logger.info("LightGBM model loaded successfully")
        except ImportError:
            raise RuntimeError("LightGBM not installed")
        except Exception as e:
            raise RuntimeError(f"Failed to load LightGBM model: {e}")
    else:
        try:
            import tensorflow as tf
            model = tf.keras.models.load_model(serverConfig.modelPath)
            logger.info("Keras model loaded successfully")
        except ImportError:
            raise RuntimeError("TensorFlow not installed")
        except Exception as e:
            raise RuntimeError(f"Failed to load Keras model: {e}")

    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")


# ===============================
# Authentication
# ===============================

def verifyAuth(token: Optional[str]) -> None:
    """Verify authentication token"""
    if serverConfig.authToken and token != serverConfig.authToken:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token"
        )


# ===============================
# Feature Processing
# ===============================

def buildFeatureArray(features: dict[str, Any]) -> np.ndarray:
    """
    Build feature array from dictionary
    Handles both camelCase and snake_case keys
    """
    # Transform to snake_case for backward compatibility
    featuresSnake = CaseTransformer.transformKeysToSnake(features)

    # Extract values in correct order
    columns = scalerInfo['columns']
    row = [featuresSnake.get(col, 0) for col in columns]

    # Convert to numpy array and scale
    arr = np.array(row, dtype=np.float64).reshape(1, -1)

    # Apply scaling if available
    if 'scaler' in scalerInfo and scalerInfo['scaler'] is not None:
        arr = scalerInfo['scaler'].transform(arr)

    return arr


def predict(features: dict[str, Any]) -> tuple[float, str]:
    """Make single prediction"""
    arr = buildFeatureArray(features)

    if modelType == 'lightgbm':
        scores = model.predict(arr, num_iteration=model.best_iteration)
        score = float(scores[0])
    else:  # keras
        scores = model.predict(arr, verbose=0)
        score = float(scores[0][0])

    # Determine label
    if score > 0.7:
        label = 'high'
    elif score > 0.4:
        label = 'medium'
    else:
        label = 'low'

    return score, label


# ===============================
# API Endpoints
# ===============================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "service": "Stockout Predictor",
        "version": serverConfig.modelVersion,
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        modelType=modelType,
        modelVersion=serverConfig.modelVersion,
        featuresCount=len(scalerInfo['columns'])
    )


@app.post("/predict", response_model=PredictionResponse)
async def predictSingle(
    request: PredictRequest,
    xInternalToken: Optional[str] = Header(None, alias="X-Internal-Token")
):
    """Single prediction endpoint"""
    verifyAuth(xInternalToken)

    try:
        score, label = predict(request.features)

        return PredictionResponse(
            productId=request.productId,
            storeId=request.storeId,
            score=score,
            label=label,
            modelVersion=serverConfig.modelVersion
        )

    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )


@app.post("/predict_batch", response_model=BatchPredictionResponse)
async def predictBatch(
    request: BatchRequest,
    xInternalToken: Optional[str] = Header(None, alias="X-Internal-Token")
):
    """Batch prediction endpoint"""
    verifyAuth(xInternalToken)

    if not request.rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No rows provided"
        )

    if len(request.rows) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 1000 rows per batch"
        )

    try:
        # Build feature arrays
        arrays = [buildFeatureArray(row.features) for row in request.rows]
        X = np.vstack(arrays)

        # Batch predict
        if modelType == 'lightgbm':
            scores = model.predict(X, num_iteration=model.best_iteration)
        else:  # keras
            scores = model.predict(X, verbose=0).flatten()

        # Format results
        results = []
        for i, score in enumerate(scores):
            score = float(score)

            if score > 0.7:
                label = 'high'
            elif score > 0.4:
                label = 'medium'
            else:
                label = 'low'

            results.append({
                'index': i,
                'score': score,
                'label': label,
                'productId': request.rows[i].productId,
                'storeId': request.rows[i].storeId
            })

        return BatchPredictionResponse(
            results=results,
            modelVersion=serverConfig.modelVersion,
            processedCount=len(results)
        )

    except Exception as e:
        logger.exception("Batch prediction failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction error: {str(e)}"
        )


@app.exception_handler(Exception)
async def globalExceptionHandler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc)
        }
    )


# ===============================
# Main
# ===============================

def main():
    """Run server"""
    uvicorn.run(
        "predictor.serve:app",
        host=serverConfig.host,
        port=serverConfig.port,
        log_level=serverConfig.logLevel,
        reload=False
    )


if __name__ == "__main__":
    main()
