"""
Integration tests for model training pipeline
"""
import pytest
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from predictor.train_model import ModelTrainer


@pytest.mark.integration
@pytest.mark.ml
class TestTrainingPipeline:
    """Test complete training pipeline"""

    @pytest.fixture
    def training_data(self, temp_data_dir):
        """Create sample training CSV"""
        # Generate synthetic training data
        n_samples = 1000
        dates = pd.date_range('2025-01-01', periods=n_samples, freq='H')

        data = {
            'productId': [f'prod-{i % 10}' for i in range(n_samples)],
            'storeId': [f'store-{i % 5}' for i in range(n_samples)],
            'snapshotDate': dates,
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
            'futureSales14d': np.random.randint(0, 200, n_samples),
            'stockout14d': np.random.randint(0, 2, n_samples)
        }

        df = pd.DataFrame(data)
        csv_path = temp_data_dir / 'training_data.csv'
        df.to_csv(csv_path, index=False)

        return csv_path

    def test_load_training_data(self, training_data):
        """Test loading training data"""
        trainer = ModelTrainer()
        X, y, df = trainer.loadData(str(training_data))

        assert X.shape[0] == 1000
        assert X.shape[1] == 21  # 21 features
        assert y.shape[0] == 1000
        assert len(df) == 1000

    def test_split_data(self, sample_training_data):
        """Test train/validation split"""
        trainer = ModelTrainer()
        X, y = sample_training_data

        X_train, X_val, y_train, y_val = trainer.splitData(X, y, testSize=0.2)

        assert len(X_train) == 800
        assert len(X_val) == 200
        assert len(y_train) == 800
        assert len(y_val) == 200

    @pytest.mark.slow
    def test_train_lightgbm_model(
            self,
            training_data,
            temp_model_dir
    ):
        """Test training LightGBM model"""
        trainer = ModelTrainer()
        X, y, _ = trainer.loadData(str(training_data))
        X_train, X_val, y_train, y_val = trainer.splitData(X, y)

        # Train model
        model = trainer.trainLightGBM(X_train, y_train, X_val, y_val)

        assert model is not None
        assert hasattr(model, 'best_iteration')
        assert model.best_iteration > 0

        # Test predictions
        predictions = model.predict(X_val[:10])
        assert len(predictions) == 10
        assert all(0 <= p <= 1 for p in predictions)

    @pytest.mark.slow
    @pytest.mark.skipif(
        not pytest.importorskip("tensorflow"),
        reason="TensorFlow not installed"
    )
    def test_train_keras_model(
            self,
            training_data,
            temp_model_dir
    ):
        """Test training Keras model"""
        trainer = ModelTrainer()
        X, y, _ = trainer.loadData(str(training_data))
        X_train, X_val, y_train, y_val = trainer.splitData(X, y)

        # Use smaller epochs for testing
        trainer.config.kerasEpochs = 2

        # Train model - returns (model, scaler) tuple
        model, scaler = trainer.trainKeras(X_train, y_train, X_val, y_val)

        assert model is not None
        assert scaler is not None

        # Test predictions using the returned scaler
        X_scaled = scaler.transform(X_val[:10])
        predictions = model.predict(X_scaled, verbose=0)
        assert len(predictions) == 10

    def test_evaluate_lightgbm(self, training_data, temp_model_dir):
        """Test model evaluation"""
        trainer = ModelTrainer()
        X, y, _ = trainer.loadData(str(training_data))
        X_train, X_val, y_train, y_val = trainer.splitData(X, y)

        # Train
        trainer.trainLightGBM(X_train, y_train, X_val, y_val)

        # Evaluate
        metrics = trainer.evaluate(X_val, y_val, 'lightgbm')

        assert 'rocAuc' in metrics
        assert 'prAuc' in metrics
        assert 0 <= metrics['rocAuc'] <= 1
        assert 0 <= metrics['prAuc'] <= 1

    def test_save_lightgbm_model(
            self,
            training_data,
            temp_model_dir
    ):
        """Test saving LightGBM model"""
        trainer = ModelTrainer()
        X, y, _ = trainer.loadData(str(training_data))
        X_train, X_val, y_train, y_val = trainer.splitData(X, y)

        # Train
        trainer.trainLightGBM(X_train, y_train, X_val, y_val)

        # Save
        model_path = temp_model_dir / 'model.bin'
        trainer.saveModel(str(model_path), 'lightgbm')

        # Verify files exist
        assert model_path.exists()
        scaler_path = temp_model_dir / 'scaler.pkl'
        assert scaler_path.exists()

        # Verify scaler content
        scaler_obj = joblib.load(scaler_path)
        assert 'columns' in scaler_obj
        assert len(scaler_obj['columns']) == 21

    @pytest.fixture
    def training_data_with_signal(self, temp_data_dir):
        """Create training data with actual signal"""
        n_samples = 1000
        dates = pd.date_range('2025-01-01', periods=n_samples, freq='h')

        # Create features with correlation to label
        sales_7d = np.random.randint(0, 100, n_samples)
        inventory_qty = np.random.randint(0, 500, n_samples)

        # Create label with actual correlation
        # Low inventory + high sales = high stockout risk
        stockout_prob = (sales_7d / 100) * (1 - inventory_qty / 500)
        stockout_prob = np.clip(stockout_prob, 0, 1)
        stockout_14d = (np.random.rand(n_samples) < stockout_prob).astype(int)

        data = {
            'productId': [f'prod-{i % 10}' for i in range(n_samples)],
            'storeId': [f'store-{i % 5}' for i in range(n_samples)],
            'snapshotDate': dates,
            'sales7d': sales_7d,
            'sales14d': sales_7d * 2 + np.random.randint(-10, 10, n_samples),
            'sales30d': sales_7d * 4 + np.random.randint(-20, 20, n_samples),
            'sales7dPerDay': sales_7d / 7,
            'sales30dPerDay': sales_7d / 7 + np.random.uniform(-1, 1, n_samples),
            'salesRatio7To30': np.random.uniform(0.2, 0.3, n_samples),
            'views7d': sales_7d * 10 + np.random.randint(-50, 50, n_samples),
            'views30d': sales_7d * 40 + np.random.randint(-200, 200, n_samples),
            'addToCarts7d': sales_7d * 2 + np.random.randint(-10, 10, n_samples),
            'viewToPurchase7d': np.random.uniform(0.05, 0.15, n_samples),
            'avgPrice': np.random.uniform(10, 100, n_samples),
            'minPrice': np.random.uniform(5, 50, n_samples),
            'maxPrice': np.random.uniform(50, 150, n_samples),
            'avgRating': np.random.uniform(3, 5, n_samples),
            'ratingCount': np.random.randint(0, 100, n_samples),
            'inventoryQty': inventory_qty,
            'daysSinceRestock': np.random.randint(0, 30, n_samples),
            'storeViews7d': np.random.randint(1000, 10000, n_samples),
            'storePurchases7d': np.random.randint(100, 1000, n_samples),
            'dayOfWeek': np.random.randint(0, 7, n_samples),
            'isWeekend': np.random.randint(0, 2, n_samples),
            'futureSales14d': sales_7d * 2 + np.random.randint(-10, 10, n_samples),
            'stockout14d': stockout_14d
        }

        df = pd.DataFrame(data)
        csv_path = temp_data_dir / 'training_data_signal.csv'
        df.to_csv(csv_path, index=False)

        return csv_path

    @pytest.mark.slow
    def test_full_training_pipeline_with_signal(
            self,
            training_data_with_signal,
            temp_model_dir
    ):
        """Test complete training pipeline with meaningful data"""
        trainer = ModelTrainer()

        # Load data
        X, y, df = trainer.loadData(str(training_data_with_signal))
        assert len(df) == 1000

        # Split
        X_train, X_val, y_train, y_val = trainer.splitData(X, y)

        # Train
        trainer.trainLightGBM(X_train, y_train, X_val, y_val)

        # Evaluate
        metrics = trainer.evaluate(X_val, y_val, 'lightgbm')

        # With signal in data, should be better than random
        assert metrics['rocAuc'] > 0.55  # Better than random

        # Save
        model_path = temp_model_dir / 'model.bin'
        trainer.saveModel(str(model_path), 'lightgbm')
        assert model_path.exists()
