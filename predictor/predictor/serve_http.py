"""
FastAPI prediction server supporting both MLP (Legacy) and TFT (Time-Series) models.
"""
from __future__ import annotations
import os
import logging
from typing import Optional, Any, List
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Header, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd

try:
    import torch
    import lightning.pytorch as pl
    from pytorch_forecasting import TemporalFusionTransformer
    HAS_TFT = True
except ImportError:
    HAS_TFT = False

from .config import serverConfig
from .case_transformer import CaseTransformer

logging.basicConfig(
    level=serverConfig.logLevel.upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

model = None
scalerInfo = None
modelType = None

app = FastAPI(
    title="SwiftEcommerce Predictor API",
    description="Unified ML prediction service (MLP/TFT)",
    version=serverConfig.modelVersion
)

class DailyStat(BaseModel):
    date: str
    purchases: float
    views: float = 0.0
    revenue: float = 0.0
    inventoryQty: float

class PredictRequest(BaseModel):
    features: Optional[dict[str, Any]] = None
    history: Optional[List[DailyStat]] = None
    productId: Optional[str] = None
    storeId: Optional[str] = None

class BatchRow(BaseModel):
    productId: Optional[str] = None
    storeId: Optional[str] = None
    features: Optional[dict[str, Any]] = None
    history: Optional[List[DailyStat]] = None

class BatchRequest(BaseModel):
    rows: list[BatchRow] = Field(..., description="List of prediction rows")

class PredictionResponse(BaseModel):
    productId: Optional[str] = None
    storeId: Optional[str] = None
    score: float
    label: str
    forecast_p50: Optional[float] = None
    forecast_p90: Optional[float] = None
    model_confidence: Optional[float] = None
    modelVersion: str

class BatchPredictionResponse(BaseModel):
    results: list[dict[str, Any]]
    modelVersion: str
    processedCount: int

class HealthResponse(BaseModel):
    status: str
    modelType: str
    modelVersion: str
    featuresCount: Optional[int] = None

@app.on_event("startup")
async def startup():
    global model, scalerInfo, modelType
    logger.info(f"Initializing service with MODEL_TYPE={serverConfig.modelType}")

    if serverConfig.modelType == 'tft':
        if not HAS_TFT: raise RuntimeError("TFT libs missing")
        model = TemporalFusionTransformer.load_from_checkpoint(
            serverConfig.modelPath,
            map_location=torch.device("cpu")
        )
        model.eval()
        modelType = 'tft'
    else:
        scalerInfo = joblib.load(serverConfig.scalerPath)
        if serverConfig.modelType == 'keras' or Path(serverConfig.modelPath).suffix == '.h5':
            modelType = 'keras'
            import tensorflow as tf
            model = tf.keras.models.load_model(serverConfig.modelPath)
        else:
            modelType = 'lightgbm'
            import lightgbm as lgb
            model = lgb.Booster(model_file=serverConfig.modelPath)

    logger.info(f"Startup complete. Active Model: {modelType}")

def _predict_tft(history: List[DailyStat], productId: str, storeId: str) -> tuple[float, str, float, float, float]:
    if not history: raise ValueError("History required for TFT")

    data = [h.dict() for h in history]
    df = pd.DataFrame(data)

    df['date'] = pd.to_datetime(df['date'])
    df['productId'] = str(productId) if productId else 'unknown'
    df['storeId'] = str(storeId) if storeId else 'unknown'

    # Fix numerical types
    cols = ['purchases', 'views', 'revenue', 'inventoryQty']
    for c in cols:
        if c in df.columns: df[c] = df[c].astype(float)
        else: df[c] = 0.0

    df = df.sort_values('date')
    df['time_idx'] = (df['date'] - df['date'].min()).dt.days
    df['dayOfWeek'] = df['date'].dt.dayofweek
    df['dayOfMonth'] = df['date'].dt.day
    df['isWeekend'] = df['dayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)

    df['log_purchases'] = np.log1p(df['purchases'])
    df['log_views'] = np.log1p(df['views'])

    df['productId'] = df['productId'].astype(str)
    df['storeId'] = df['storeId'].astype(str)

    with torch.no_grad():
        raw = model.predict(df, mode="quantiles", return_x=False)
        p50 = raw[0, :, 3].sum().item()
        p10 = raw[0, :, 1].sum().item()
        p90 = raw[0, :, 5].sum().item() # Index 5 is 0.9

        # Confidence calculation
        uncertainty_range = p90 - p10
        rel_uncertainty = uncertainty_range / (p50 + 1.0)
        model_confidence = max(0.0, 1.0 - rel_uncertainty)

    current_inv = history[-1].inventoryQty

    label = 'low'
    if p50 > current_inv: label = 'high'
    elif p90 > current_inv: label = 'medium'

    score = 0.1
    if label == 'high': score = 0.95
    elif label == 'medium': score = 0.55

    return score, label, p50, p90, model_confidence

def _predict_mlp(features: dict[str, Any]) -> tuple[float, str, float, float, float]:
    if features is None: raise ValueError("Features required")
    fs = CaseTransformer.transformKeysToSnake(features)
    vec = [fs.get(col, 0) for col in scalerInfo['columns']]
    arr = np.array(vec, dtype=np.float64).reshape(1, -1)
    if 'scaler' in scalerInfo: arr = scalerInfo['scaler'].transform(arr)

    if modelType == 'lightgbm':
        score = float(model.predict(arr)[0])
    else:
        score = float(model.predict(arr)[0][0])

    label = 'high' if score > 0.7 else ('medium' if score > 0.4 else 'low')
    return score, label, 0.0, 0.0, 0.0

@app.post("/predict", response_model=PredictionResponse)
async def predictSingle(request: PredictRequest, xInternalToken: Optional[str] = Header(None, alias="X-Internal-Token")):
    if serverConfig.authToken and xInternalToken != serverConfig.authToken:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        if modelType == 'tft':
            score, label, p50, p90, conf = _predict_tft(request.history, request.productId, request.storeId)
        else:
            score, label, p50, p90, conf = _predict_mlp(request.features)

        return PredictionResponse(
            productId=request.productId,
            storeId=request.storeId,
            score=score,
            label=label,
            forecast_p50=p50,
            forecast_p90=p90,
            model_confidence=conf,
            modelVersion=serverConfig.modelVersion
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_batch", response_model=BatchPredictionResponse)
async def predictBatch(request: BatchRequest, xInternalToken: Optional[str] = Header(None, alias="X-Internal-Token")):
    if serverConfig.authToken and xInternalToken != serverConfig.authToken:
        raise HTTPException(status_code=401, detail="Unauthorized")

    results = []
    for i, row in enumerate(request.rows):
        try:
            if modelType == 'tft':
                score, label, p50, p90, conf = _predict_tft(row.history, row.productId, row.storeId)
            else:
                score, label, p50, p90, conf = _predict_mlp(row.features)

            results.append({
                'index': i,
                'score': score,
                'label': label,
                'forecast_p50': p50,
                'forecast_p90': p90,
                'model_confidence': conf,
                'productId': row.productId
            })
        except Exception as e:
            results.append({'index': i, 'error': str(e)})

    return BatchPredictionResponse(
        results=results,
        modelVersion=serverConfig.modelVersion,
        processedCount=len(results)
    )

@app.get("/health")
async def health():
    return HealthResponse(status="healthy", modelType=str(modelType), modelVersion=serverConfig.modelVersion)

def main():
    uvicorn.run("predictor.serve:app", host=serverConfig.host, port=serverConfig.port)

if __name__ == "__main__":
    main()
