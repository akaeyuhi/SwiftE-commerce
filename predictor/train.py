import os
import argparse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from tensorflow.keras.utils import to_categorical

def build_model(input_dim, hidden=[128, 64], dropout=0.2):
    model = Sequential()
    model.add(Dense(hidden[0], input_dim=input_dim, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dropout(dropout))

    for h in hidden[1:]:
        model.add(Dense(h, activation='relu'))
        model.add(BatchNormalization())
        model.add(Dropout(dropout))

    # Output: probability of stockout (binary)
    model.add(Dense(1, activation='sigmoid'))
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['AUC'])
    return model

def load_data(csv_path, target_col='stockout_14d'):
    df = pd.read_csv(csv_path)
    # drop rows with missing target
    df = df[~df[target_col].isna()]
    X = df.drop(columns=[target_col, 'productId', 'date'], errors='ignore')
    y = df[target_col].astype(float).values
    return X, y, df

def main(args):
    X, y, raw = load_data(args.csv)
    # basic preprocessing: fillna
    X = X.fillna(0)
    # keep feature columns as numeric only for baseline
    numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    X = X[numeric_cols]
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    X_train, X_val, y_train, y_val = train_test_split(Xs, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y))>1 else None)

    model = build_model(input_dim=X_train.shape[1], hidden=[128,64], dropout=0.2)

    os.makedirs(args.out_dir, exist_ok=True)
    chk = ModelCheckpoint(os.path.join(args.out_dir, 'model.h5'), save_best_only=True, monitor='val_loss')
    es = EarlyStopping(monitor='val_loss', patience=5)

    model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=100, batch_size=256, callbacks=[chk, es])

    # Save scaler for inference
    import pickle
    with open(os.path.join(args.out_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump({'columns': numeric_cols, 'scaler': scaler}, f)

    print('Training finished. Model saved to', args.out_dir)

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--csv', required=True, help='CSV file with features + stockout_14d label')
    p.add_argument('--out-dir', default='model', help='Output dir for model artifacts')
    args = p.parse_args()
    main(args)
