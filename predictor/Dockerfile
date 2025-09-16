# predictor/Dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY serve.py /app/serve.py

# copies of model files should be provided at build or mounted at runtime
# default MODEL_PATH: /app/model/model.bin or /app/model/model.h5
VOLUME ["/app/model"]

EXPOSE 8080
CMD ["python", "serve.py"]
