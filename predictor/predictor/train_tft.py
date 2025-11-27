"""
Train Temporal Fusion Transformer (TFT) for Demand/Stockout Prediction.
Requires: pytorch-forecasting>=1.0.0, lightning>=2.0.0, torch>=2.0.0
"""
from __future__ import annotations
import os
import argparse
import logging
from pathlib import Path
import pandas as pd
import numpy as np
import torch

import lightning.pytorch as pl
from lightning.pytorch.callbacks import EarlyStopping, ModelCheckpoint

from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer
from pytorch_forecasting.data import GroupNormalizer, EncoderNormalizer
# FIX: Import NaNLabelEncoder
from pytorch_forecasting.data.encoders import NaNLabelEncoder
from pytorch_forecasting.metrics import QuantileLoss, RMSE, MAE

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TFTTrainer:
    def __init__(self, data_path: str, model_out_path: str):
        self.data_path = data_path
        self.model_out_path = model_out_path

        # Hyperparameters
        self.MAX_PREDICTION_LENGTH = 14
        self.MAX_ENCODER_LENGTH = 30
        self.BATCH_SIZE = 64
        self.LEARNING_RATE = 0.03
        self.EPOCHS = 30
        self.HIDDEN_SIZE = 16
        self.ATTENTION_HEADS = 4
        self.DROPOUT = 0.1

    def load_and_verify_data(self) -> pd.DataFrame:
        logger.info(f"Loading data from {self.data_path}")
        data = pd.read_csv(self.data_path, low_memory=False)

        if 'date' in data.columns:
            data['date'] = pd.to_datetime(data['date'])

        data['productId'] = data['productId'].astype(str)
        if 'storeId' not in data.columns:
            data['storeId'] = 'store_1'
        data['storeId'] = data['storeId'].astype(str)

        # --- Data Cleaning Pipeline ---
        numeric_cols = [
            'purchases', 'views', 'revenue', 'inventoryQty',
            'log_purchases', 'log_views'
        ]

        for col in numeric_cols:
            if col in data.columns:
                data[col] = pd.to_numeric(data[col], errors='coerce')

                if data[col].isnull().any():
                    data[col] = data[col].fillna(0.0)

                if np.isinf(data[col]).any():
                    data[col] = data[col].replace([np.inf, -np.inf], 0.0)

        if 'purchases' in data.columns:
            data['purchases'] = data['purchases'].clip(lower=0.0)

        # Filter out Constant/Dead Products
        if 'purchases' in data.columns:
            initial_len = len(data)
            group_std = data.groupby(['productId', 'storeId'])['purchases'].transform('std')
            group_std = group_std.fillna(0)
            data = data[group_std > 1e-4].reset_index(drop=True)

            dropped_rows = initial_len - len(data)
            if dropped_rows > 0:
                logger.warning(f"Dropped {dropped_rows} rows of constant/dead products.")

        if 'time_idx' not in data.columns:
            raise ValueError("Data must have 'time_idx' column for TFT.")

        logger.info(f"Verified data: {len(data)} rows remaining.")
        return data

    def create_datasets(self, data: pd.DataFrame):
        """Create PyTorch Forecasting TimeSeriesDataSet"""

        max_time_idx = data["time_idx"].max()
        training_cutoff = max_time_idx - self.MAX_PREDICTION_LENGTH

        logger.info(f"Training cutoff time_idx: {training_cutoff}")

        training_dataset = TimeSeriesDataSet(
            data[lambda x: x.time_idx <= training_cutoff],
            time_idx="time_idx",
            target="purchases",
            group_ids=["productId", "storeId"],
            min_encoder_length=self.MAX_ENCODER_LENGTH // 2,
            max_encoder_length=self.MAX_ENCODER_LENGTH,
            min_prediction_length=1,
            max_prediction_length=self.MAX_PREDICTION_LENGTH,

            static_categoricals=["productId", "storeId"],

            time_varying_known_reals=["time_idx", "dayOfWeek", "dayOfMonth", "isWeekend"],

            time_varying_unknown_reals=[
                col for col in [
                    "purchases",
                    "views",
                    "revenue",
                    "log_purchases",
                    "log_views",
                    "inventoryQty"
                ] if col in data.columns
            ],

            # FIX: Handle unknown categories (new products/stores) gracefully
            categorical_encoders={
                "productId": NaNLabelEncoder(add_nan=True),
                "storeId": NaNLabelEncoder(add_nan=True),
            },

            target_normalizer=GroupNormalizer(
                groups=["productId", "storeId"], transformation="softplus"
            ),
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
            allow_missing_timesteps=True
        )

        validation_dataset = TimeSeriesDataSet.from_dataset(
            training_dataset,
            data,
            predict=True,
            stop_randomization=True
        )

        train_dataloader = training_dataset.to_dataloader(
            train=True, batch_size=self.BATCH_SIZE, num_workers=0
        )
        val_dataloader = validation_dataset.to_dataloader(
            train=False, batch_size=self.BATCH_SIZE * 10, num_workers=0
        )

        return training_dataset, train_dataloader, val_dataloader

    def train(self):
        data = self.load_and_verify_data()
        training_dataset, train_dataloader, val_dataloader = self.create_datasets(data)

        tft = TemporalFusionTransformer.from_dataset(
            training_dataset,
            learning_rate=self.LEARNING_RATE,
            hidden_size=self.HIDDEN_SIZE,
            attention_head_size=self.ATTENTION_HEADS,
            dropout=self.DROPOUT,
            hidden_continuous_size=self.HIDDEN_SIZE,
            output_size=7,
            loss=QuantileLoss(),
            log_interval=10,
            reduce_on_plateau_patience=4,
        )

        logger.info(f"Model parameters: {tft.hparams}")

        checkpoint_callback = ModelCheckpoint(
            monitor="val_loss",
            dirpath=Path(self.model_out_path).parent,
            filename="tft",
            save_top_k=1,
            mode="min"
        )

        early_stop_callback = EarlyStopping(
            monitor="val_loss",
            min_delta=1e-4,
            patience=10,
            verbose=False,
            mode="min"
        )

        trainer = pl.Trainer(
            max_epochs=self.EPOCHS,
            accelerator="auto",
            enable_model_summary=True,
            gradient_clip_val=0.1,
            callbacks=[early_stop_callback, checkpoint_callback],
            limit_train_batches=30,
        )

        logger.info("Starting training...")
        trainer.fit(
            tft,
            train_dataloaders=train_dataloader,
            val_dataloaders=val_dataloader,
        )

        model_path = trainer.checkpoint_callback.best_model_path
        tft_model = TemporalFusionTransformer.load_from_checkpoint(model_path)

        logger.info(f"Model saved at: {model_path}")

        actuals = torch.cat([y[0] for x, y in iter(val_dataloader)])
        predictions = tft_model.predict(val_dataloader)

        mae = (actuals - predictions).abs().mean()
        logger.info(f"Validation MAE: {mae:.4f}")

def main():
    parser = argparse.ArgumentParser(description='Train TFT model for demand prediction')
    parser.add_argument('--in', dest='input', required=True, help='Input CSV (Time Series format)')
    parser.add_argument('--out', required=True, help='Output model path')

    args = parser.parse_args()

    trainer = TFTTrainer(args.input, args.out)
    trainer.train()

if __name__ == '__main__':
    main()
