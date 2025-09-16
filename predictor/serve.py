"""
serve.py

FastAPI predictor for LightGBM/Keras models.

Environment variables:
  MODEL_TYPE: 'lightgbm' or 'keras'   (optional, autodetected by files)
  MODEL_PATH: path to model file or directory
  SCALER_PATH: path to scaler.pkl (contains {'scaler', 'columns'})
  PREDICTOR_AUTH_TOKEN: optional token to require in header 'X-Internal-Token'
  MODEL_VERSION: optional string saved with predictions
"""
from __future__ import annotations
import os
import uvicorn
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import joblib
import numpy as np
import logging

logger = logging.getLogger("uvicorn.error")

MODEL_PATH = os.environ.get("MODEL_PATH", "./model/model.bin")
SCALER_PATH = os.environ.get("SCALER_PATH", "./model/scaler.pkl")
MODEL_TYPE = os.environ.get("MODEL_TYPE", None)
PREDICTOR_AUTH_TOKEN = os.environ.get("PREDICTOR_AUTH_TOKEN", None)
MODEL_VERSION = os.environ.get("MODEL_VERSION", "v1")

app = FastAPI(title="Predictor")

class PredictRequest(BaseModel):
    features: Dict[str, Any]
    productId: Optional[str] = None
    storeId: Optional[str] = None

class BatchRow(BaseModel):
    productId: Optional[str] = None
    storeId: Optional[str] = None
    features: Dict[str, Any]

class BatchRequest(BaseModel):
    rows: List[BatchRow]

@app.on_event("startup")
def startup():
    global model, scaler_info, model_type
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError(f"scaler.pkl not found: {SCALER_PATH}")
    scaler_info = joblib.load(SCALER_PATH)
    cols = scaler_info.get("columns")
    if not cols:
        raise RuntimeError("scaler.pkl missing 'columns' list")
    # detect model type by env or file extension
    if MODEL_TYPE:
        model_type = MODEL_TYPE
    else:
        if MODEL_PATH.endswith(".h5") or os.path.isdir(MODEL_PATH):
            model_type = "keras"
        else:
            model_type = "lightgbm"
    if model_type == "lightgbm":
        try:
            import lightgbm as lgb
        except Exception as ex:
            raise RuntimeError("lightgbm not installed") from ex
        model = lgb.Booster(model_file=MODEL_PATH)
    else:
        try:
            import tensorflow as tf
        except Exception as ex:
            raise RuntimeError("tensorflow not installed") from ex
        model = tf.keras.models.load_model(MODEL_PATH)
    logger.info(f"Loaded model_type={model_type}, model='{MODEL_PATH}'")

def build_feature_array(features: Dict[str, Any]) -> np.ndarray:
    cols = scaler_info["columns"]
    row = [features.get(c, 0) for c in cols]
    arr = np.array(row, dtype=float).reshape(1, -1)
    arr_scaled = scaler_info["scaler"].transform(arr)
    return arr_scaled

@app.post("/predict")
async def predict(req: PredictRequest, x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")):
    if PREDICTOR_AUTH_TOKEN and x_internal_token != PREDICTOR_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        arr = build_feature_array(req.features)
        if model_type == "lightgbm":
            scores = model.predict(arr, num_iteration=model.best_iteration)
            score = float(scores[0])
        else:
            scores = model.predict(arr)
            score = float(scores[0][0])
        label = "high" if score > 0.7 else ("medium" if score > 0.4 else "low")
        return {
            "productId": req.productId,
            "storeId": req.storeId,
            "score": score,
            "label": label,
            "modelVersion": MODEL_VERSION,
        }
    except Exception as ex:
        logger.exception("prediction failed")
        raise HTTPException(status_code=500, detail=str(ex))

@app.post("/predict_batch")
async def predict_batch(req: BatchRequest, x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")):
    if PREDICTOR_AUTH_TOKEN and x_internal_token != PREDICTOR_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        rows = []
        for r in req.rows:
            arr = build_feature_array(r.features)
            rows.append(arr)
        X = np.vstack(rows)
        if model_type == "lightgbm":
            scores = model.predict(X, num_iteration=model.best_iteration).tolist()
        else:
            scores = model.predict(X).flatten().tolist()
        out = []
        for i, s in enumerate(scores):
            label = "high" if s > 0.7 else ("medium" if s > 0.4 else "low")
            out.append({"index": i, "score": float(s), "label": label})
        return {"results": out, "modelVersion": MODEL_VERSION}
    except Exception as ex:
        logger.exception("batch prediction failed")
        raise HTTPException(status_code=500, detail=str(ex))

if __name__ == "__main__":
    uvicorn.run("serve:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), log_level="info")
