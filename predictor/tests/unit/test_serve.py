"""
Unit tests for FastAPI serve module
"""
import pytest
import numpy as np
import joblib
from unittest.mock import Mock, MagicMock, patch
from fastapi.testclient import TestClient
from pathlib import Path


@pytest.fixture
def mock_model_files(tmp_path):
    """Create mock model files"""
    # Create scaler file
    scaler_obj = {
        'scaler': None,
        'columns': [f'feature_{i}' for i in range(21)]
    }
    scaler_path = tmp_path / 'scaler.pkl'
    joblib.dump(scaler_obj, scaler_path)

    # Create mock model file
    model_path = tmp_path / 'model.bin'
    model_path.write_text("mock model")

    return {
        'model_path': str(model_path),
        'scaler_path': str(scaler_path)
    }


@pytest.fixture
def test_app(mock_model_files):
    """Create test FastAPI app with mocked dependencies"""
    from predictor import serve

    # Patch config
    with patch.object(serve.serverConfig, 'modelPath', mock_model_files['model_path']), \
            patch.object(serve.serverConfig, 'scalerPath', mock_model_files['scaler_path']), \
            patch.object(serve.serverConfig, 'authToken', None), \
            patch.object(serve.serverConfig, 'modelType', 'lightgbm'):
        # Create mock model
        mock_model = MagicMock()
        mock_model.predict = MagicMock(return_value=np.array([0.75]))
        mock_model.best_iteration = 100

        serve.model = mock_model
        serve.scalerInfo = {
            'scaler': None,
            'columns': [f'feature_{i}' for i in range(21)]
        }
        serve.modelType = 'lightgbm'

        client = TestClient(serve.app)
        yield client


class TestServerEndpoints:
    """Test FastAPI endpoints"""

    def test_root_endpoint(self, test_app):
        """Test root endpoint"""
        response = test_app.get('/')
        assert response.status_code == 200
        data = response.json()
        assert data['service'] == 'Stockout Predictor'
        assert 'version' in data
        assert data['status'] == 'running'

    def test_health_endpoint(self, test_app):
        """Test health check endpoint"""
        response = test_app.get('/health')
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert data['modelType'] == 'lightgbm'
        assert data['featuresCount'] == 21

    def test_predict_single(self, test_app):
        """Test single prediction"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {
            'productId': 'prod-123',
            'storeId': 'store-456',
            'features': features
        }

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 200
        data = response.json()

        assert 'score' in data
        assert 'label' in data
        assert 0 <= data['score'] <= 1
        assert data['label'] in ['high', 'medium', 'low']
        assert data['productId'] == 'prod-123'

    def test_predict_single_high_score(self, test_app):
        """Test prediction with high score"""
        from predictor import serve
        serve.model.predict = MagicMock(return_value=np.array([0.85]))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['label'] == 'high'

    def test_predict_single_medium_score(self, test_app):
        """Test prediction with medium score"""
        from predictor import serve
        serve.model.predict = MagicMock(return_value=np.array([0.55]))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['label'] == 'medium'

    def test_predict_single_low_score(self, test_app):
        """Test prediction with low score"""
        from predictor import serve
        serve.model.predict = MagicMock(return_value=np.array([0.25]))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['label'] == 'low'

    def test_predict_batch(self, test_app):
        """Test batch prediction"""
        from predictor import serve
        serve.model.predict = MagicMock(return_value=np.array([0.6, 0.7, 0.8]))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {
            'rows': [
                {'productId': f'prod-{i}', 'features': features}
                for i in range(3)
            ]
        }

        response = test_app.post('/predict_batch', json=payload)
        assert response.status_code == 200
        data = response.json()

        assert 'results' in data
        assert len(data['results']) == 3
        assert data['processedCount'] == 3

        for result in data['results']:
            assert 'score' in result
            assert 'label' in result
            assert 'index' in result

    def test_predict_batch_empty(self, test_app):
        """Test batch prediction with empty rows"""
        payload = {'rows': []}

        response = test_app.post('/predict_batch', json=payload)
        assert response.status_code == 400
        assert 'No rows provided' in response.json()['detail']

    def test_predict_batch_too_large(self, test_app):
        """Test batch prediction with too many rows"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {
            'rows': [{'features': features} for _ in range(1001)]
        }

        response = test_app.post('/predict_batch', json=payload)
        assert response.status_code == 400
        assert 'Maximum 1000 rows' in response.json()['detail']

    def test_predict_with_camelcase_features(self, test_app):
        """Test prediction with camelCase feature names"""
        features = {
            'sales7d': 50,
            'sales14d': 100,
            'viewToPurchase7d': 0.1,
            'avgPrice': 35.99
        }
        # Fill remaining features with zeros
        for i in range(17):
            features[f'feature_{i}'] = 0.0

        payload = {'features': features}

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 200

    def test_predict_with_snake_case_features(self, test_app):
        """Test prediction with snake_case feature names"""
        features = {
            'sales_7d': 50,
            'sales_14d': 100,
            'view_to_purchase_7d': 0.1,
            'avg_price': 35.99
        }
        # Fill remaining features
        for i in range(17):
            features[f'feature_{i}'] = 0.0

        payload = {'features': features}

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 200


class TestAuthentication:
    """Test authentication"""

    @pytest.fixture
    def auth_app(self, mock_model_files):
        """Create app with authentication enabled"""
        from predictor import serve

        with patch.object(serve.serverConfig, 'modelPath', mock_model_files['model_path']), \
                patch.object(serve.serverConfig, 'scalerPath', mock_model_files['scaler_path']), \
                patch.object(serve.serverConfig, 'authToken', 'secret-token'), \
                patch.object(serve.serverConfig, 'modelType', 'lightgbm'):
            mock_model = MagicMock()
            mock_model.predict = MagicMock(return_value=np.array([0.75]))
            mock_model.best_iteration = 100

            serve.model = mock_model
            serve.scalerInfo = {
                'scaler': None,
                'columns': [f'feature_{i}' for i in range(21)]
            }
            serve.modelType = 'lightgbm'
            serve.serverConfig.authToken = 'secret-token'

            client = TestClient(serve.app)
            yield client

    def test_predict_without_auth(self, auth_app):
        """Test prediction without auth token"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}

        response = auth_app.post('/predict', json=payload)
        assert response.status_code == 401
        assert 'Invalid or missing authentication token' in response.json()['detail']

    def test_predict_with_valid_auth(self, auth_app):
        """Test prediction with valid auth token"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}
        headers = {'X-Internal-Token': 'secret-token'}

        response = auth_app.post('/predict', json=payload, headers=headers)
        assert response.status_code == 200

    def test_predict_with_invalid_auth(self, auth_app):
        """Test prediction with invalid auth token"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}
        headers = {'X-Internal-Token': 'wrong-token'}

        response = auth_app.post('/predict', json=payload, headers=headers)
        assert response.status_code == 401

    def test_batch_predict_with_auth(self, auth_app):
        """Test batch prediction with auth"""
        from predictor import serve
        serve.model.predict = MagicMock(return_value=np.array([0.6, 0.7]))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {
            'rows': [
                {'features': features},
                {'features': features}
            ]
        }
        headers = {'X-Internal-Token': 'secret-token'}

        response = auth_app.post('/predict_batch', json=payload, headers=headers)
        assert response.status_code == 200


class TestKerasModel:
    """Test with Keras model type"""

    @pytest.fixture
    def keras_app(self, mock_model_files):
        """Create app with Keras model"""
        from predictor import serve

        with patch.object(serve.serverConfig, 'modelPath', mock_model_files['model_path']), \
                patch.object(serve.serverConfig, 'scalerPath', mock_model_files['scaler_path']), \
                patch.object(serve.serverConfig, 'authToken', None), \
                patch.object(serve.serverConfig, 'modelType', 'keras'):
            # Mock Keras model
            mock_model = MagicMock()
            mock_model.predict = MagicMock(return_value=np.array([[0.75]]))

            serve.model = mock_model
            serve.scalerInfo = {
                'scaler': None,
                'columns': [f'feature_{i}' for i in range(21)]
            }
            serve.modelType = 'keras'

            client = TestClient(serve.app)
            yield client

    def test_keras_predict_single(self, keras_app):
        """Test Keras model single prediction"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}

        response = keras_app.post('/predict', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 'score' in data
        assert data['label'] in ['high', 'medium', 'low']

    def test_keras_predict_batch(self, keras_app):
        """Test Keras model batch prediction"""
        from predictor import serve
        serve.model.predict = MagicMock(return_value=np.array([[0.6], [0.7], [0.8]]))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {
            'rows': [{'features': features} for _ in range(3)]
        }

        response = keras_app.post('/predict_batch', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data['results']) == 3


class TestErrorHandling:
    """Test error handling"""

    def test_predict_with_exception(self, test_app):
        """Test prediction error handling"""
        from predictor import serve
        serve.model.predict = MagicMock(side_effect=Exception("Model error"))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {'features': features}

        response = test_app.post('/predict', json=payload)
        assert response.status_code == 500
        assert 'Prediction error' in response.json()['detail']

    def test_batch_predict_with_exception(self, test_app):
        """Test batch prediction error handling"""
        from predictor import serve
        serve.model.predict = MagicMock(side_effect=Exception("Batch error"))

        features = {f'feature_{i}': float(i) for i in range(21)}
        payload = {
            'rows': [{'features': features}]
        }

        response = test_app.post('/predict_batch', json=payload)
        assert response.status_code == 500
        assert 'Batch prediction error' in response.json()['detail']


class TestFeatureProcessing:
    """Test feature processing"""

    def test_build_feature_array(self, test_app):
        """Test feature array building"""
        from predictor import serve

        features = {f'feature_{i}': float(i) for i in range(21)}
        arr = serve.buildFeatureArray(features)

        assert arr.shape == (1, 21)
        assert arr.dtype == np.float64

    def test_build_feature_array_with_missing_features(self, test_app):
        """Test feature array with missing features (filled with zeros)"""
        from predictor import serve

        features = {'feature_0': 1.0, 'feature_1': 2.0}
        arr = serve.buildFeatureArray(features)

        assert arr.shape == (1, 21)
        assert arr[0, 0] == 1.0
        assert arr[0, 1] == 2.0
        assert arr[0, 2] == 0.0  # Missing features default to 0

    def test_build_feature_array_with_scaler(self, test_app):
        """Test feature array with scaler"""
        from predictor import serve
        from sklearn.preprocessing import StandardScaler

        # Create and fit real scaler
        scaler = StandardScaler()
        scaler.fit(np.random.randn(100, 21))

        serve.scalerInfo['scaler'] = scaler

        features = {f'feature_{i}': float(i) for i in range(21)}
        arr = serve.buildFeatureArray(features)

        assert arr.shape == (1, 21)
        # Values should be scaled
        assert not np.allclose(arr, np.arange(21))


class TestStartupShutdown:
    """Test startup and shutdown events"""

    @pytest.mark.skip(reason="Startup/shutdown events are integration tests")
    def test_startup_loads_model(self):
        """Test startup event loads model"""
        # This would require testing the actual startup event
        # which is covered by integration tests
        pass

    @pytest.mark.skip(reason="Startup/shutdown events are integration tests")
    def test_shutdown_cleanup(self):
        """Test shutdown event cleanup"""
        pass
