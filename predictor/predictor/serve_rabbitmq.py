"""
RabbitMQ prediction server supporting both MLP and TFT models.
"""
from __future__ import annotations
import logging
import json
import joblib
import numpy as np
import pandas as pd
import pika
from pathlib import Path

# Conditional imports
try:
    import torch
    import lightning.pytorch as pl
    from pytorch_forecasting import TemporalFusionTransformer
    HAS_TFT = True
except ImportError:
    HAS_TFT = False

from .config import serverConfig
from .case_transformer import CaseTransformer
from .rabbitmq import RabbitMQ

logging.basicConfig(
    level=serverConfig.logLevel.upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

model = None
scalerInfo = None
modelType = None

def startup():
    global model, scalerInfo, modelType
    logger.info(f"Starting RabbitMQ worker with MODEL_TYPE={serverConfig.modelType}")


    if serverConfig.modelType == 'tft':
        if not HAS_TFT: raise RuntimeError("TFT libs missing")
        logger.info(f"Loading TFT model from {serverConfig.modelPath}")
        model = TemporalFusionTransformer.load_from_checkpoint(
            serverConfig.modelPath,
            map_location=torch.device("cpu")
        )
        model.eval()
        modelType = 'tft'
    else:
        logger.info(f"Loading Legacy model from {serverConfig.modelPath}")
        scalerInfo = joblib.load(serverConfig.scalerPath)
        if serverConfig.modelType == 'keras' or Path(serverConfig.modelPath).suffix == '.h5':
            import tensorflow as tf
            model = tf.keras.models.load_model(serverConfig.modelPath)
            modelType = 'keras'
        else:
            import lightgbm as lgb
            model = lgb.Booster(model_file=serverConfig.modelPath)
            modelType = 'lightgbm'

    logger.info(f"Model loaded: {modelType}")

def _predict_tft_single(row):
    history = row.get('history', [])
    if not history: return 0.0, 'error', 0, 0, 0.0

    df = pd.DataFrame(history)
    df['date'] = pd.to_datetime(df['date'])
    df['productId'] = str(row.get('productId', 'unknown'))
    df['storeId'] = str(row.get('storeId', 'unknown'))

    # FIX: Force float types
    numeric_cols = ['purchases', 'views', 'revenue', 'inventoryQty']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].astype(float)
        else:
            df[col] = 0.0

    df = df.sort_values('date')
    df['time_idx'] = (df['date'] - df['date'].min()).dt.days
    df['dayOfWeek'] = df['date'].dt.dayofweek
    df['dayOfMonth'] = df['date'].dt.day
    df['isWeekend'] = df['dayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)

    df['log_purchases'] = np.log1p(df['purchases'])
    df['log_views'] = np.log1p(df['views'])

    df['productId'] = df['productId'].astype(str)
    df['storeId'] = df['storeId'].astype(str)

    current = float(history[-1].get('inventoryQty', 0))

    with torch.no_grad():
        # Predict
        raw = model.predict(df, mode="quantiles", return_x=False)

        # Summing predictions over the forecast horizon
        p50 = raw[0, :, 3].sum().item() # Median
        p90 = raw[0, :, 5].sum().item() # P90

         # Confidence Calculation: Median / (Conservative_Max + epsilon)
        model_confidence = p50 / (p90 + 1e-3)
        model_confidence = min(max(model_confidence, 0.0), 1.0)

          # Days Until Stockout Calculation
        forecast_horizon_days = raw.shape[1]
        daily_burn_rate = p50 / max(1.0, float(forecast_horizon_days))

        if daily_burn_rate <= 0.01:
            days_until_stockout = 999
        else:
            days_until_stockout = int(current / daily_burn_rate)


    label = 'low'
    if p50 > current: label = 'high'
    elif p90 > current: label = 'medium'

    score = 0.1
    if label == 'high': score = 0.95
    elif label == 'medium': score = 0.55

    return score, label, p50, p90, model_confidence, days_until_stockout

def _predict_mlp_single(row):
    feat = row.get('features')
    if not feat: return 0.0, 'error', 0, 0, 0.0

    fs = CaseTransformer.transformKeysToSnake(feat)
    vec = [fs.get(c, 0) for c in scalerInfo['columns']]
    arr = np.array(vec).reshape(1, -1)
    if 'scaler' in scalerInfo:
        arr = scalerInfo['scaler'].transform(arr)

    if modelType == 'lightgbm':
        score = float(model.predict(arr)[0])
    else:
        score = float(model.predict(arr)[0][0])

    label = 'high' if score > 0.7 else ('medium' if score > 0.4 else 'low')
    return score, label, 0, 0, 0.0

def on_message(ch, method, properties, body):
    try:
        req = json.loads(body)
        rows = req.get('data', {}).get('rows', [])
        results = []

        for i, row in enumerate(rows):
            try:
                if modelType == 'tft':
                    score, label, p50, p90, conf, days_until_stockout = _predict_tft_single(row)
                else:
                    score, label, p50, p90, conf = _predict_mlp_single(row)

                results.append({
                    'index': i,
                    'score': score,
                    'label': label,
                    'forecast_p50': p50,
                    'forecast_p90': p90,
                    'model_confidence': conf,
                    'days_until_stockout': days_until_stockout,
                    'productId': row.get('productId')
                })
            except Exception as e:
                logger.error(f"Err {i}: {e}")
                results.append({'index': i, 'error': str(e)})

        resp = {'results': results, 'modelVersion': serverConfig.modelVersion}

        if properties.reply_to:
            ch.basic_publish(
                exchange='',
                routing_key=properties.reply_to,
                properties=pika.BasicProperties(correlation_id=properties.correlation_id),
                body=json.dumps(resp)
            )
    except Exception as e:
        logger.error(f"MQ Error: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    startup()
    mq = RabbitMQ()
    mq.connect()
    mq.consume('prediction_requests', on_message)

if __name__ == "__main__":
    main()
