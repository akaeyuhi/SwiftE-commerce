FROM python:3.10-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app
COPY predictor/requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
  && pip install --no-cache-dir -r requirements.txt \
  && apt-get remove -y build-essential && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY predictor/app ./app
COPY predictor/model ./model 2>/dev/null || true

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
