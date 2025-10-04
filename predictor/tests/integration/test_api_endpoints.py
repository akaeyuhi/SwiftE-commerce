"""
Integration tests for API endpoints
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock, Mock
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestAPIEndpoints:
    """Test FastAPI server endpoints"""

    @pytest.fixture
    def app_with_mocks(self):
        """Create app with mocked dependencies"""
        # Must import here to avoid module-level issues
        from predictor import serve
        from predictor.config import featureConfig

        # Create mocks
        mock_model = MagicMock()
        mock_model.predict = Mock(return_value=np.array([0.75]))
        mock_model.best_iteration = 100

        mock_scaler_info = {
            'scaler': None,
            'columns': featureConfig.featureColumns
        }

        # Patch module-level variables
        with patch.object(serve, 'model', mock_model), \
             patch.object(serve, 'scalerInfo', mock_scaler_info), \
             patch.object(serve, 'modelType', 'lightgbm'):

            yield serve.app

    @pytest.fixture
    def client(self, app_with_mocks):
        """Create test client"""
        return TestClient(app_with_mocks)

    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get('/')
        assert response.status_code == 200

    def test_health_endpoint(self, client):
        """Test health check"""
        response = client.get('/health')
        assert response.status_code == 200

    def test_predict_endpoint_success(self, client, sample_features):
        """Test prediction with auth"""
        from predictor import serve

        # Temporarily disable auth for testing
        original_token = serve.serverConfig.authToken
        serve.serverConfig.authToken = None

        try:
            payload = {
                'productId': 'prod-123',
                'features': sample_features
            }

            response = client.post('/predict', json=payload)

            assert response.status_code == 200
            data = response.json()
            assert 'score' in data
            assert 'label' in data
        finally:
            serve.serverConfig.authToken = original_token

    def test_predict_endpoint_missing_auth(self, client, sample_features):
        """Test prediction without auth when required"""
        from predictor import serve

        # Enable auth
        original_token = serve.serverConfig.authToken
        serve.serverConfig.authToken = 'required-token'

        try:
            payload = {'features': sample_features}
            response = client.post('/predict', json=payload)

            # Should fail without token
            assert response.status_code == 401
        finally:
            serve.serverConfig.authToken = original_token

    def test_predict_batch_endpoint(self, client, sample_features):
        """Test batch prediction"""
        from predictor import serve

        # Disable auth
        original_token = serve.serverConfig.authToken
        serve.serverConfig.authToken = None

        # Mock batch predictions
        mock_predictions = np.array([0.6, 0.7, 0.8, 0.5, 0.9])
        serve.model.predict = Mock(return_value=mock_predictions)

        try:
            payload = {
                'rows': [
                    {'productId': f'prod-{i}', 'features': sample_features}
                    for i in range(5)
                ]
            }

            response = client.post('/predict_batch', json=payload)

            assert response.status_code == 200
            data = response.json()
            assert 'results' in data
            assert len(data['results']) == 5
        finally:
            serve.serverConfig.authToken = original_token
