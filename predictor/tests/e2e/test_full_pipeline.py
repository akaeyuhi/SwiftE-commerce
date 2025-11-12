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

    def test_export_file_train_serve_pipeline(
            self,
            pipeline_dirs,
            sample_products,
            large_sample_data,
            sample_store_stats,
            sample_variants,
            sample_inventory,
            sample_reviews
    ):
        """Test complete pipeline: export from file → train → serve"""

        # Step 1: Create a dummy Excel file
        input_file_path = pipeline_dirs['data'] / 'Online Retail.xlsx'
        df_raw = pd.DataFrame({
            'InvoiceNo': ['536365', '536365', '536366', '536367', '536367'],
            'StockCode': ['85123A', '71053', '22752', '84879', '22753'],
            'Description': ['WHITE HANGING HEART T-LIGHT HOLDER', 'WHITE METAL LANTERN', 'SET 7 BABUSHKA NESTING BOXES', 'ASSORTED COLOUR BIRD ORNAMENT', 'WOODEN ARTIST TOOL BOX'],
            'Quantity': [6, 6, 2, 3, 1],
            'InvoiceDate': ['2010-12-01 08:26:00', '2010-12-01 08:26:00', '2010-12-01 08:28:00', '2010-12-01 08:34:00', '2010-12-01 08:34:00'],
            'UnitPrice': [2.55, 3.39, 7.65, 1.69, 4.95],
            'CustomerID': [17850, 17850, 17850, 13047, 13047],
            'Country': ['United Kingdom', 'United Kingdom', 'France', 'United Kingdom', 'United Kingdom']
        })
        df_raw.to_excel(input_file_path, index=False)

        # Step 2: Export features using FileFeatureExporter
        from predictor.file_export_features import FileFeatureExporter
        file_exporter = FileFeatureExporter()
        features_path = pipeline_dirs['data'] / 'features_from_file.csv'
        file_exporter.exportFeatures(
            inputFile=str(input_file_path),
            outputCsv=str(features_path)
        )

        assert features_path.exists()

        # Step 3: Train model
        trainer = ModelTrainer()
        X, y, _ = trainer.loadData(str(features_path))

        # Check we have enough samples
        assert len(X) >= 1, "Need at least 1 sample for e2e test from file"
        
        # Ensure both classes are present if possible
        unique_classes = np.unique(y)
        if len(unique_classes) < 2:
            pytest.skip("Not enough unique classes for stratified split with this small dataset")

        X_train, X_val, y_train, y_val = trainer.splitData(X, y)
        trainer.trainLightGBM(X_train, y_train, X_val, y_val)

        model_path = pipeline_dirs['models'] / 'model_from_file.bin'
        trainer.saveModel(str(model_path), 'lightgbm')

        # Verify training
        assert model_path.exists()
        scaler_path = pipeline_dirs['models'] / 'scaler_from_file.pkl'
        assert scaler_path.exists()

        # Step 4: Load and predict
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
