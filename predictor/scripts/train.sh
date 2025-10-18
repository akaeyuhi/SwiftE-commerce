#!/bin/bash
set -e

NAMESPACE="predictor"
START_DATE="${START_DATE:-2025-01-01}"
END_DATE="${END_DATE:-2025-10-01}"

log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

# Run export job
log_info "Starting feature export..."
kubectl delete job predictor-export -n ${NAMESPACE} --ignore-not-found=true

cat <<EOF | kubectl apply -f -
$(cat k8s/training/job-export.yaml | sed "s/2025-01-01/${START_DATE}/g" | sed "s/2025-10-01/${END_DATE}/g")
EOF

kubectl wait --for=condition=complete --timeout=3600s job/predictor-export -n ${NAMESPACE}

# Run training job
log_info "Starting model training..."
kubectl delete job predictor-train -n ${NAMESPACE} --ignore-not-found=true
kubectl apply -f k8s/training/job-train.yaml

kubectl wait --for=condition=complete --timeout=3600s job/predictor-train -n ${NAMESPACE}

log_info "Training complete! Restarting serving pods..."
kubectl rollout restart deployment/predictor-serve -n ${NAMESPACE}

log_info "Done!"
