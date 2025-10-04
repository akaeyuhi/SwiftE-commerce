#!/bin/bash
set -e

NAMESPACE="predictor"
CONTEXT="${KUBE_CONTEXT:-$(kubectl config current-context)}"

log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Create namespace
log_info "Creating namespace..."
kubectl apply -f k8s/base/namespace.yaml --context="${CONTEXT}"

# Apply base resources
log_info "Applying base resources..."
kubectl apply -f k8s/base/configmap.yaml --context="${CONTEXT}"
kubectl apply -f k8s/base/secret.yaml --context="${CONTEXT}"
kubectl apply -f k8s/base/pvc.yaml --context="${CONTEXT}"

# Deploy serving
log_info "Deploying serving components..."
kubectl apply -f k8s/serving/ --context="${CONTEXT}"

# Wait for rollout
log_info "Waiting for deployment to complete..."
kubectl rollout status deployment/predictor-serve -n ${NAMESPACE} --context="${CONTEXT}"

log_info "Deployment complete!"
