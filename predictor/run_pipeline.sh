#!/usr/bin/env bash
set -euo pipefail

# Usage: ./run_pipeline.sh 2024-01-01 2024-06-30
START=${1:-}
END=${2:-}
if [[ -z "$START" || -z "$END" ]]; then
  echo "Usage: $0 <start> <end>"
  exit 1
fi

OUT_CSV="data/features_${START}_${END}.csv"
MODEL_DIR="model"
LGB_MODEL_FILE="${MODEL_DIR}/lightgbm.bin"
SCALER_FILE="${MODEL_DIR}/scaler.pkl"
PREDICTOR_MODEL_PATH="${LGB_MODEL_FILE}"

mkdir -p data
mkdir -p ${MODEL_DIR}

echo "1) Exporting features to ${OUT_CSV}..."
python export_features.py --start "${START}" --end "${END}" --out "${OUT_CSV}"

echo "2) Training LightGBM model..."
python train_model.py --in "${OUT_CSV}" --model lightgbm --out "${LGB_MODEL_FILE}"

if [[ ! -f "${SCALER_FILE}" ]]; then
  echo "ERROR: scaler.pkl not written"
  exit 2
fi

echo "3) Starting predictor (local) in background..."
export MODEL_PATH="${PREDICTOR_MODEL_PATH}"
export SCALER_PATH="${SCALER_FILE}"
export MODEL_VERSION="v1"
export PREDICTOR_AUTH_TOKEN="devtoken"

# run uvicorn in background; nohup to keep alive
nohup python serve.py > predictor.log 2>&1 &
PRED_PID=$!
echo "Predictor started with PID ${PRED_PID}. Logs: predictor.log"
echo "You can call http://localhost:8080/predict with header X-Internal-Token: devtoken"
