from setuptools import setup, find_packages

setup(
    name="predictor",
    version="1.0.0",
    description="Stockout prediction ML service",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "sqlalchemy>=2.0.0",
        "psycopg2-binary>=2.9.0",
        "pydantic>=2.0.0",
        "openpyxl>=3.0.0",
        "pika>=1.2.0",
    ],
    extras_require={
        "train": [
            "scikit-learn>=1.3.0",
            "lightgbm>=4.0.0",
            "tensorflow>=2.13.0",
            "joblib>=1.3.0",
        ],
        "serve": [
            "fastapi>=0.104.0",
            "uvicorn[standard]>=0.24.0",
            "joblib>=1.3.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "predictor-export=predictor.export_features:main",
            "predictor-train=predictor.train_model:main",
            "predictor-serve=predictor.serve:main",
            "predictor-serve-rabbitmq=predictor.serve_rabbitmq:main",
            "predictor-export-file=predictor.file_export_features:main",
        ],
    },
)
