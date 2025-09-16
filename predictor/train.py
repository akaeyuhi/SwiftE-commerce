"""
train_model.py

Train a model using the exported CSV from export_features.py

- Default model: LightGBM (fast, good for structured data)
- Optionally train a Keras neural net (requires tensorflow installed)
- Saves model file and scaler.pkl containing {'scaler': StandardScaler, 'columns': feature_columns}

Usage:
  python train_model.py --in data/features.csv --model lightgbm --out model/lightgbm.bin
  python train_model.py --in data/features.csv --model keras --out model/keras_dir

Environment:
  Set NUM_THREADS or OMP_NUM_THREADS if training parallelized frameworks.
"""

from __future__ import annotations
import os
import argparse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib

try:
    import lightgbm as lgb
except Exception:
    lgb = None

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
except Exception:
    tf = None


def train_lightgbm(X_train, y_train, X_val, y_val, params=None, num_rounds=1000, early_stopping=50):
    if lgb is None:
        raise RuntimeError("lightgbm not installed. Install lightgbm or pick keras.")
    if params is None:
        params = {
            "objective": "binary",
            "metric": ["auc", "binary_logloss"],
            "verbosity": -1,
            "boosting": "gbdt",
            "seed": 42,
        }
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
    model = lgb.train(params, train_data, num_boost_round=num_rounds, valid_sets=[val_data], early_stopping_rounds=early_stopping, verbose_eval=50)
    return model


def build_keras_model(input_dim, hidden=[128, 64], dropout=0.2):
    model = Sequential()
    model.add(Dense(hidden[0], input_dim=input_dim, activation="relu"))
    model.add(BatchNormalization())
    model.add(Dropout(dropout))
    for h in hidden[1:]:
        model.add(Dense(h, activation="relu"))
        model.add(BatchNormalization())
        model.add(Dropout(dropout))
    model.add(Dense(1, activation="sigmoid"))
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["AUC"])
    return model


def train_keras_model(X_train, y_train, X_val, y_val, out_dir, epochs=100, batch_size=256):
    if tf is None:
        raise RuntimeError("tensorflow not installed; cannot train keras model")
    os.makedirs(out_dir, exist_ok=True)
    scaler = StandardScaler().fit(X_train)  # caller should reuse columns, but we scale here too
    X_train_s = scaler.transform(X_train)
    X_val_s = scaler.transform(X_val)
    model = build_keras_model(X_train_s.shape[1], hidden=[128,64], dropout=0.2)
    model_path = os.path.join(out_dir, "model.h5")
    chk = ModelCheckpoint(model_path, save_best_only=True, monitor="val_loss")
    es = EarlyStopping(monitor="val_loss", patience=8)
    model.fit(X_train_s, y_train, validation_data=(X_val_s, y_val), epochs=epochs, batch_size=batch_size, callbacks=[chk, es])
    # save scaler and columns will be done by caller
    return model, scaler


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="infile", required=True, help="Input CSV file with features")
    p.add_argument("--model", choices=["lightgbm", "keras"], default="lightgbm", help="Backend")
    p.add_argument("--out", required=True, help="Output model path (file for lightgbm, dir for keras)")
    p.add_argument("--test-size", type=float, default=0.15, help="Validation split fraction")
    args = p.parse_args()

    df = pd.read_csv(args.infile)
    # Drop rows with missing label
    df = df.dropna(subset=["stockout_14d"]).reset_index(drop=True)

    # feature columns - MUST match the exporter and the Nest buildFeatureVector keys
    features = [
        "sales_7d","sales_14d","sales_30d","sales_7d_per_day","sales_30d_per_day","sales_ratio_7_30",
        "views_7d","views_30d","addToCarts_7d","view_to_purchase_7d",
        "avg_price","min_price","max_price",
        "avg_rating","rating_count",
        "inventory_qty","days_since_restock",
        "store_views_7d","store_purchases_7d",
        "day_of_week","is_weekend"
    ]
    for f in features:
        if f not in df.columns:
            df[f] = 0.0

    X = df[features].fillna(0).astype(float).values
    y = df["stockout_14d"].astype(int).values

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=args.test_size, random_state=42, stratify=y if len(np.unique(y))>1 else None)

    if args.model == "lightgbm":
        print("Training LightGBM model...")
        model = train_lightgbm(X_train, y_train, X_val, y_val)
        model_out = args.out
        os.makedirs(os.path.dirname(model_out) or ".", exist_ok=True)
        model.save_model(model_out)
        # save scaler (fit on full X for inference) and columns
        scaler = StandardScaler().fit(X)  # fit on full dataset for final scaler
        scaler_obj = {"scaler": scaler, "columns": features}
        joblib.dump(scaler_obj, os.path.join(os.path.dirname(model_out), "scaler.pkl"))
        print(f"Saved LightGBM model to {model_out} and scaler.pkl to {os.path.dirname(model_out)}")
    else:
        print("Training Keras model...")
        model, scaler = train_keras_model(X_train, y_train, X_val, y_val, args.out, epochs=100)
        # save scaler + columns
        scaler_obj = {"scaler": scaler, "columns": features}
        joblib.dump(scaler_obj, os.path.join(args.out, "scaler.pkl"))
        print(f"Saved Keras model to {args.out} and scaler.pkl")

    print("Training finished.")


if __name__ == "__main__":
    main()
