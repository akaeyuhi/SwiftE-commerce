"""
RabbitMQ prediction server with camelCase support

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
import json

import joblib
import numpy as np
import pika

from .config import serverConfig
from .case_transformer import CaseTransformer
from .rabbitmq import RabbitMQ

logging.basicConfig(
    level=serverConfig.logLevel.upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global model and scaler
model = None
scalerInfo = None
modelType = None

def startup():
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


def predictBatch(request: dict) -> dict:
    """Batch prediction endpoint"""
    if not request.get('rows'):
        raise ValueError("No rows provided")

    if len(request['rows']) > 1000:
        raise ValueError("Maximum 1000 rows per batch")

    try:
        # Build feature arrays
        arrays = [buildFeatureArray(row['features']) for row in request['rows']]
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
                'productId': request['rows'][i].get('productId'),
                'storeId': request['rows'][i].get('storeId')
            })

        return {
            'results': results,
            'modelVersion': serverConfig.modelVersion,
            'processedCount': len(results)
        }

    except Exception as e:
        logger.exception("Batch prediction failed")
        raise


def on_message(ch, method, properties, body):
    """Callback function to process incoming messages."""
    logger.info("Received message")
    try:
        request = json.loads(body)
        data = request['data']
        response = predictBatch(data)
        ch.basic_publish(
            exchange='',
            routing_key=properties.reply_to,
            properties=pika.BasicProperties(correlation_id=properties.correlation_id),
            body=json.dumps(response)
        )
    except Exception as e:
        logger.error(f"Error processing message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def main():
    """Run server"""
    startup()
    rabbitmq = RabbitMQ()
    rabbitmq.connect()
    rabbitmq.consume('prediction_requests', on_message)


if __name__ == "__main__":
    main()
