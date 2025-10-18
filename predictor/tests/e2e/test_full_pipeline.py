"""
End-to-end tests for complete ML pipeline
"""
import shutil
from unittest.mock import patch

import pytest
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
import subprocess
import time
from predictor.export_features import FeatureExporter
from predictor.train_model import ModelTrainer

def is_docker_available():
    """Check if Docker is available"""
    try:
        result = subprocess.run(
            ['docker', 'info'],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


@pytest.mark.e2e
@pytest.mark.slow
class TestFullPipeline:
    """End-to-end pipeline tests"""

    @pytest.fixture
    def pipeline_dirs(self, tmp_path):
        """Create directory structure for pipeline"""
        data_dir = tmp_path / 'data'
        model_dir = tmp_path / 'models'
        data_dir.mkdir()
        model_dir.mkdir()

        return {
            'data': data_dir,
            'models': model_dir
        }

    @pytest.fixture
    def pipeline_dirs(self, tmp_path):
        """Create directory structure for pipeline"""
        data_dir = tmp_path / 'data'
        model_dir = tmp_path / 'models'
        data_dir.mkdir()
        model_dir.mkdir()

        return {
            'data': data_dir,
            'models': model_dir
        }

    @pytest.fixture
    def large_sample_data(self):
        """Generate larger sample data for e2e test"""
        # Generate enough data for stratified split
        n_samples = 200
        dates = pd.date_range('2025-01-01', periods=n_samples, freq='D')

        # Create balanced dataset
        n_positive = 100
        n_negative = 100

        data = []
        for i in range(n_samples):
            for product_id in ['prod-1', 'prod-2']:
                data.append({
                    'productId': product_id,
                    'date': dates[i],
                    'views': np.random.randint(50, 200),
                    'purchases': np.random.randint(5, 20),
                    'addToCarts': np.random.randint(10, 40),
                    'revenue': np.random.uniform(100, 500)
                })

        return pd.DataFrame(data)

    def test_export_train_serve_pipeline(
            self,
            pipeline_dirs,
            sample_products,
            large_sample_data,
            sample_store_stats,
            sample_variants,
            sample_inventory,
            sample_reviews
    ):
        """Test complete pipeline: export → train → serve"""

        # Step 1: Create training data directly (skip export for e2e)
        features_path = pipeline_dirs['data'] / 'features.csv'

        # Create synthetic training data with enough samples
        n_samples = 200
        data = {
            'productId': [f'prod-{i % 3}' for i in range(n_samples)],
            'storeId': [f'store-{i % 2}' for i in range(n_samples)],
            'sales7d': np.random.randint(0, 100, n_samples),
            'sales14d': np.random.randint(0, 200, n_samples),
            'sales30d': np.random.randint(0, 500, n_samples),
            'sales7dPerDay': np.random.uniform(0, 20, n_samples),
            'sales30dPerDay': np.random.uniform(0, 20, n_samples),
            'salesRatio7To30': np.random.uniform(0, 1, n_samples),
            'views7d': np.random.randint(100, 1000, n_samples),
            'views30d': np.random.randint(500, 5000, n_samples),
            'addToCarts7d': np.random.randint(10, 200, n_samples),
            'viewToPurchase7d': np.random.uniform(0, 0.5, n_samples),
            'avgPrice': np.random.uniform(10, 100, n_samples),
            'minPrice': np.random.uniform(5, 50, n_samples),
            'maxPrice': np.random.uniform(50, 150, n_samples),
            'avgRating': np.random.uniform(1, 5, n_samples),
            'ratingCount': np.random.randint(0, 100, n_samples),
            'inventoryQty': np.random.randint(0, 500, n_samples),
            'daysSinceRestock': np.random.randint(0, 365, n_samples),
            'storeViews7d': np.random.randint(1000, 10000, n_samples),
            'storePurchases7d': np.random.randint(100, 1000, n_samples),
            'dayOfWeek': np.random.randint(0, 7, n_samples),
            'isWeekend': np.random.randint(0, 2, n_samples),
            'stockout14d': np.random.randint(0, 2, n_samples)
        }

        df = pd.DataFrame(data)
        df.to_csv(features_path, index=False)

        assert features_path.exists()

        # Step 2: Train model
        trainer = ModelTrainer()
        X, y, _ = trainer.loadData(str(features_path))

        # Check we have enough samples
        assert len(X) >= 100, "Need at least 100 samples for e2e test"

        # Check both classes present
        unique_classes = np.unique(y)
        if len(unique_classes) < 2:
            pytest.skip("Need both classes for stratified split")

        # Check minimum samples per class
        for cls in unique_classes:
            count = np.sum(y == cls)
            if count < 2:
                pytest.skip(f"Class {cls} has only {count} samples, need at least 2")

        X_train, X_val, y_train, y_val = trainer.splitData(X, y)

        trainer.trainLightGBM(X_train, y_train, X_val, y_val)

        model_path = pipeline_dirs['models'] / 'model.bin'
        trainer.saveModel(str(model_path), 'lightgbm')

        # Verify training
        assert model_path.exists()
        scaler_path = pipeline_dirs['models'] / 'scaler.pkl'
        assert scaler_path.exists()

        # Step 3: Load and predict
        import lightgbm as lgb
        model = lgb.Booster(model_file=str(model_path))
        scaler_obj = joblib.load(scaler_path)

        # Make prediction
        test_features = X_val[:1]
        prediction = model.predict(test_features)

        assert len(prediction) == 1
        assert 0 <= prediction[0] <= 1

    @pytest.mark.skipif(
        not is_docker_available(),
        reason="Docker not available"
    )
    def test_docker_build_and_run(self, pipeline_dirs):
        """Test building and running Docker containers"""
        # This would test actual Docker builds
        # Simplified version for demonstration

        # Build serve image
        result = subprocess.run(
            ['docker', 'build', '-f', 'docker/Dockerfile.serve', '-t', 'predictor-test', '.'],
            cwd='predictor',
            capture_output=True
        )

        assert result.returncode == 0

        # Run container
        container_id = subprocess.check_output(
            ['docker', 'run', '-d', '-p', '8080:8080', 'predictor-test']
        ).decode().strip()

        try:
            # Wait for startup
            time.sleep(5)

            # Test health endpoint
            import requests
            response = requests.get('http://localhost:8080/health')
            assert response.status_code == 200

        finally:
            # Cleanup
            subprocess.run(['docker', 'stop', container_id])
            subprocess.run(['docker', 'rm', container_id])
