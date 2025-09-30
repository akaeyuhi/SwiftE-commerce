FROM python:3.10-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /build

# copy predictor sources (always present)
COPY predictor/ ./predictor

# install deps in runtime stage (or here as you prefer)
FROM python:3.10-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# install runtime deps
COPY predictor/requirements.txt /app/requirements.txt
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
  && pip install --no-cache-dir -r /app/requirements.txt \
  && apt-get remove -y build-essential && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# always copy predictor app
COPY --from=builder /build/predictor /app

# create model dir and, if there were model files in the build stage, move them
RUN mkdir -p /app/model \
 && if [ -d /app/model ] ; then echo "model dir exists"; fi \
 # If builder shipped model files at /app/model (because predictor/model existed in context),
 # they are already copied — otherwise there's nothing to do. This RUN ensures directory exists.

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
