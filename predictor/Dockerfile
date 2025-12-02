# Unified Dockerfile for Predictor Service

# ================================
# Base Stage
# ================================
# Use a specific Python version for reproducibility.
FROM python:3.10-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ================================
# Builder Stage
# ================================
# This stage installs all dependencies to be cached by Docker.
FROM base AS builder
WORKDIR /app

# Copy all requirements files and setup.py
COPY requirements.txt requirements-serve.txt requirements-train.txt ./
COPY setup.py ./

# Install all dependencies. requirements-train includes most dependencies.
# We install serve as well to get FastAPI and Uvicorn.
RUN pip install -r requirements-train.txt && pip install -r requirements-serve.txt

# Copy the application source code
COPY predictor/ ./predictor/

# Install the application itself in editable mode
RUN pip install -e .

# ================================
# Final Stage: Serve
# ================================
# This is the lean image for running the prediction server.
FROM base AS serve
WORKDIR /app

# Copy the installed Python packages from the builder stage
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY predictor/ ./predictor

# Create a non-root user for security
RUN useradd -m -u 1000 predictor && \
    chown -R predictor:predictor /app
USER predictor

# Healthcheck to ensure the server is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

# Use the entrypoint defined in setup.py
CMD ["predictor-serve"]

# ================================
# Final Stage: Train / Export
# ================================
# This image is used for running one-off jobs like training or feature exporting.
# It can be larger as it includes the build environment and source code.
FROM builder AS train
WORKDIR /app

# The 'builder' stage already has all code and dependencies.
# We just need to set the user.
RUN useradd -m -u 1000 trainer && \
    chown -R trainer:trainer /app
USER trainer

# Default command can be overridden, e.g., 'docker run ... predictor-train'
CMD ["predictor-train", "--help"]