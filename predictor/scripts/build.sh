#!/bin/bash
set -e

# Configuration
REGISTRY="${DOCKER_REGISTRY:-your-registry.io}"
PROJECT="${PROJECT_NAME:-predictor}"
VERSION="${VERSION:-latest}"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
BUILD_SERVE=false
BUILD_TRAIN=false
BUILD_EXPORT=false
PUSH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --serve)
            BUILD_SERVE=true
            shift
            ;;
        --train)
            BUILD_TRAIN=true
            shift
            ;;
        --export)
            BUILD_EXPORT=true
            shift
            ;;
        --all)
            BUILD_SERVE=true
            BUILD_TRAIN=true
            BUILD_EXPORT=true
            shift
            ;;
        --push)
            PUSH=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Default to building all if none specified
if [ "$BUILD_SERVE" = false ] && [ "$BUILD_TRAIN" = false ] && [ "$BUILD_EXPORT" = false ]; then
    BUILD_SERVE=true
    BUILD_TRAIN=true
    BUILD_EXPORT=true
fi

# Build serving image
if [ "$BUILD_SERVE" = true ]; then
    log_info "Building serving image..."
    docker build \
        -f docker/Dockerfile.serve \
        -t ${REGISTRY}/${PROJECT}-serve:${VERSION} \
        -t ${REGISTRY}/${PROJECT}-serve:${GIT_COMMIT} \
        --build-arg MODEL_VERSION=${VERSION} \
        --build-arg BUILD_DATE=${BUILD_DATE} \
        --build-arg VCS_REF=${GIT_COMMIT} \
        .

    if [ "$PUSH" = true ]; then
        log_info "Pushing serving image..."
        docker push ${REGISTRY}/${PROJECT}-serve:${VERSION}
        docker push ${REGISTRY}/${PROJECT}-serve:${GIT_COMMIT}
    fi
fi

# Build training image
if [ "$BUILD_TRAIN" = true ]; then
    log_info "Building training image..."
    docker build \
        -f docker/Dockerfile.train \
        -t ${REGISTRY}/${PROJECT}-train:${VERSION} \
        -t ${REGISTRY}/${PROJECT}-train:${GIT_COMMIT} \
        .

    if [ "$PUSH" = true ]; then
        log_info "Pushing training image..."
        docker push ${REGISTRY}/${PROJECT}-train:${VERSION}
        docker push ${REGISTRY}/${PROJECT}-train:${GIT_COMMIT}
    fi
fi

# Build export image
if [ "$BUILD_EXPORT" = true ]; then
    log_info "Building export image..."
    docker build \
        -f docker/Dockerfile.export \
        -t ${REGISTRY}/${PROJECT}-export:${VERSION} \
        -t ${REGISTRY}/${PROJECT}-export:${GIT_COMMIT} \
        .

    if [ "$PUSH" = true ]; then
        log_info "Pushing export image..."
        docker push ${REGISTRY}/${PROJECT}-export:${VERSION}
        docker push ${REGISTRY}/${PROJECT}-export:${GIT_COMMIT}
    fi
fi

log_info "Build complete!"
