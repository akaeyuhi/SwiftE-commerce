import os
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import numpy as np
import pickle
import tensorflow as tf

MODEL_DIR = os.environ.get('MODEL_DIR', './model')
MODEL_PATH = os.path.join(MODEL_DIR, 'model.h5')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

app = FastAPI(title='Store Predictor')

class PredictRequest(BaseModel):
    features: Dict[str, Any]  # single example
    productId: Optional[str] = None
    storeId: Optional[str] = None

class BatchPredictRequest(BaseModel):
    rows: List[Dict[str, Any]]

@app.on_event('startup')
def load_model():
    global model, scaler_info
    model = tf.keras.models.load_model(MODEL_PATH)
    with open(SCALER_PATH, 'rb') as f:
        scaler_info = pickle.load(f)
    print('Model and scaler loaded')

def prepare_row(features: Dict[str, Any]):
    cols = scaler_info['columns']
    # create vector in the same order
    x = [features.get(c, 0) for c in cols]
    return np.array(x, dtype=float)

@app.post('/predict')
def predict(req: PredictRequest):
    x = prepare_row(req.features).reshape(1, -1)
    x = scaler_info['scaler'].transform(x)
    prob = float(model.predict(x)[0,0])
    # simple decision
    risk_label = 'high' if prob > 0.7 else ('medium' if prob > 0.4 else 'low')
    return {
        'productId': req.productId,
        'storeId': req.storeId,
        'score': prob,
        'label': risk_label,
        'modelVersion': os.environ.get('MODEL_VERSION','v1'),
    }

@app.post('/predict_batch')
def predict_batch(req: BatchPredictRequest):
    xs = np.vstack([prepare_row(r) for r in req.rows])
    xs = scaler_info['scaler'].transform(xs)
    probs = model.predict(xs).flatten().tolist()
    res = []
    for i, p in enumerate(probs):
        res.append({'index': i, 'score': float(p), 'label': 'high' if p > 0.7 else ('medium' if p > 0.4 else 'low')})
    return {'results': res}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
