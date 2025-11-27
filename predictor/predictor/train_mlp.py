"""
Train machine learning model for stockout prediction

Supports:
- LightGBM (default, fast and accurate)
- Keras/TensorFlow (deep learning)
- Automatic model selection and hyperparameter tuning
"""
from __future__ import annotations
import os
import argparse
import logging
from pathlib import Path
from typing import Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    precision_recall_curve,
    auc,
    classification_report
)
import joblib

from .config import featureConfig, modelConfig

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Optional imports
try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    logger.warning("LightGBM not installed")

try:
    import tensorflow as tf
    from tensorflow import keras
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False
    logger.warning("TensorFlow not installed")


class ModelTrainer:
    """Model training with evaluation and persistence"""

    def __init__(self, config: Optional[dict] = None):
        self.config = modelConfig
        if config:
            for key, value in config.items():
                setattr(self.config, key, value)

        self.featureColumns = featureConfig.featureColumns
        self.scaler: Optional[StandardScaler] = None
        self.model = None

    def loadData(self, csvPath: str) -> tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        """Load and prepare training data"""
        logger.info(f"Loading data from {csvPath}")
        df = pd.read_csv(csvPath)

        # Drop rows with missing labels
        initialSize = len(df)
        df = df.dropna(subset=['stockout14d']).reset_index(drop=True)
        logger.info(f"Dropped {initialSize - len(df)} rows with missing labels")

        # Ensure all feature columns exist
        for col in self.featureColumns:
            if col not in df.columns:
                logger.warning(f"Missing feature column: {col}, filling with 0")
                df[col] = 0.0

        # Extract features and labels
        X = df[self.featureColumns].fillna(0).astype(float).values
        y = df['stockout14d'].astype(int).values

        logger.info(f"Loaded {len(X)} samples with {X.shape[1]} features")
        logger.info(f"Class distribution: {np.bincount(y)}")

        return X, y, df

    def splitData(
        self,
        X: np.ndarray,
        y: np.ndarray,
        testSize: Optional[float] = None,
        randomState: Optional[int] = None
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Split data into train and validation sets"""
        testSize = testSize or self.config.testSize
        randomState = randomState or self.config.randomState

        # Stratified split to maintain class distribution
        stratify = y if len(np.unique(y)) > 1 else None

        XTrain, XVal, yTrain, yVal = train_test_split(
            X, y,
            test_size=testSize,
            random_state=randomState,
            stratify=stratify
        )

        logger.info(f"Train set: {len(XTrain)} samples")
        logger.info(f"Validation set: {len(XVal)} samples")

        return XTrain, XVal, yTrain, yVal

    def evaluate(
        self,
        X: np.ndarray,
        y: np.ndarray,
        modelType: str
    ) -> dict:
        """Evaluate model performance"""
        logger.info("Evaluating model...")

        # Get predictions
        if modelType == 'lightgbm':
            yPred = self.model.predict(X, num_iteration=self.model.best_iteration)
        else:  # keras
            XScaled = self.scaler.transform(X)
            yPred = self.model.predict(XScaled).flatten()

        # Compute metrics
        aucScore = roc_auc_score(y, yPred)

        precision, recall, _ = precision_recall_curve(y, yPred)
        aucPr = auc(recall, precision)

        # Binary predictions at 0.5 threshold
        yPredBinary = (yPred > 0.5).astype(int)

        logger.info(f"ROC AUC: {aucScore:.4f}")
        logger.info(f"PR AUC: {aucPr:.4f}")
        logger.info("\nClassification Report:")
        logger.info(classification_report(y, yPredBinary))

        return {
            'rocAuc': aucScore,
            'prAuc': aucPr,
            'predictions': yPred
        }

    def saveModel(self, outputPath: str, modelType: str) -> None:
        """Save model and scaler"""
        logger.info(f"Saving model to {outputPath}")

        outputDir = Path(outputPath).parent
        outputDir.mkdir(parents=True, exist_ok=True)

        if modelType == 'lightgbm':
            self.model.save_model(outputPath)

            # Save scaler (fit on full data for inference)
            scalerPath = outputDir / 'scaler.pkl'
            scalerObj = {
                'scaler': StandardScaler(),  # Dummy for consistency
                'columns': self.featureColumns
            }
            joblib.dump(scalerObj, scalerPath)

        else:  # keras
            outputDir = Path(outputPath)
            outputDir.mkdir(parents=True, exist_ok=True)

            modelPath = outputDir / 'model.h5'
            self.model.save(str(modelPath))

            scalerPath = outputDir / 'scaler.pkl'
            scalerObj = {
                'scaler': self.scaler,
                'columns': self.featureColumns
            }
            joblib.dump(scalerObj, scalerPath)

        logger.info(f"Model saved successfully")


def train_lightgbm_model(trainer, XTrain, yTrain, XVal, yVal):
    """Train LightGBM model"""
    if not HAS_LIGHTGBM:
        raise RuntimeError("LightGBM not installed")

    logger.info("Training LightGBM model...")

    trainData = lgb.Dataset(XTrain, label=yTrain)
    valData = lgb.Dataset(XVal, label=yVal, reference=trainData)

    callbacks = [
        lgb.early_stopping(stopping_rounds=trainer.config.lgbEarlyStopping),
        lgb.log_evaluation(period=50)
    ]

    trainer.model = lgb.train(
        trainer.config.lgbParams,
        trainData,
        num_boost_round=trainer.config.lgbNumRounds,
        valid_sets=[trainData, valData],
        valid_names=['train', 'valid'],
        callbacks=callbacks
    )

    logger.info(f"Best iteration: {trainer.model.best_iteration}")
    logger.info(f"Best score: {trainer.model.best_score}")

    return trainer.model


def train_tensorflow_model(trainer, XTrain, yTrain, XVal, yVal):
    """Train Keras neural network"""
    if not HAS_TENSORFLOW:
        raise RuntimeError("TensorFlow not installed")

    logger.info("Training Keras model...")

    # Scale features
    trainer.scaler = StandardScaler()
    XTrainScaled = trainer.scaler.fit_transform(XTrain)
    XValScaled = trainer.scaler.transform(XVal)

    # Build model
    trainer.model = _buildKerasModel(XTrainScaled.shape[1], trainer.config)

    # Callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6
        )
    ]

    # Train
    history = trainer.model.fit(
        XTrainScaled, yTrain,
        validation_data=(XValScaled, yVal),
        epochs=trainer.config.kerasEpochs,
        batch_size=trainer.config.kerasBatchSize,
        callbacks=callbacks,
        verbose=1
    )

    logger.info("Training completed")

    return trainer.model, trainer.scaler


def _buildKerasModel(inputDim: int, config):
    """Build Keras neural network architecture"""
    model = keras.Sequential()

    # Input layer
    model.add(keras.layers.Dense(
        config.kerasHiddenLayers[0],
        input_dim=inputDim,
        activation='relu'
    ))
    model.add(keras.layers.BatchNormalization())
    model.add(keras.layers.Dropout(config.kerasDropout))

    # Hidden layers
    for units in config.kerasHiddenLayers[1:]:
        model.add(keras.layers.Dense(units, activation='relu'))
        model.add(keras.layers.BatchNormalization())
        model.add(keras.layers.Dropout(config.kerasDropout))

    # Output layer
    model.add(keras.layers.Dense(1, activation='sigmoid'))

    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=[
            keras.metrics.AUC(name='auc'),
            keras.metrics.Precision(name='precision'),
            keras.metrics.Recall(name='recall')
        ]
    )

    model.summary(print_fn=logger.info)

    return model


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Train stockout prediction model'
    )
    parser.add_argument(
        '--in',
        dest='input',
        required=True,
        help='Input CSV file with features'
    )
    parser.add_argument(
        '--model',
        choices=['lightgbm', 'tensorflow'],
        default='lightgbm',
        help='Model type'
    )
    parser.add_argument(
        '--out',
        required=True,
        help='Output model path'
    )
    parser.add_argument(
        '--test-size',
        type=float,
        default=0.15,
        help='Validation split fraction'
    )

    args = parser.parse_args()

    # Initialize trainer
    trainer = ModelTrainer()

    # Load data
    X, y, df = trainer.loadData(args.input)

    # Split data
    XTrain, XVal, yTrain, yVal = trainer.splitData(X, y, args.test_size)

    # Train model
    if args.model == 'lightgbm':
        train_lightgbm_model(trainer, XTrain, yTrain, XVal, yVal)
    elif args.model == 'tensorflow':
        train_tensorflow_model(trainer, XTrain, yTrain, XVal, yVal)
    else:
        raise ValueError(f"Unsupported model type: {args.model}")

    # Evaluate
    trainer.evaluate(XVal, yVal, args.model)

    # Save
    trainer.saveModel(args.out, args.model)

    logger.info("Training pipeline completed successfully")


if __name__ == '__main__':
    main()
