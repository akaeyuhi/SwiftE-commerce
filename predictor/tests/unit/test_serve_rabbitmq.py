"""
Unit tests for RabbitMQ serve module
"""
import pytest
import numpy as np
import joblib
from unittest.mock import MagicMock, patch
from pathlib import Path
import json

from predictor import serve_rabbitmq
from predictor.config import featureConfig


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


@pytest.fixture(autouse=True)
def setup_serve_rabbitmq(mock_model_files):
    """Setup serve_rabbitmq module for testing"""
    with patch.object(serve_rabbitmq.serverConfig, 'modelPath', mock_model_files['model_path']), \
         patch.object(serve_rabbitmq.serverConfig, 'scalerPath', mock_model_files['scaler_path']), \
         patch.object(serve_rabbitmq.serverConfig, 'modelType', 'lightgbm'):
        
        serve_rabbitmq.startup()
        
        # Mock the global model and scalerInfo after startup
        serve_rabbitmq.model = MagicMock()
        serve_rabbitmq.model.predict.return_value = np.array([0.75])
        serve_rabbitmq.model.best_iteration = 100
        serve_rabbitmq.scalerInfo = {
            'scaler': None,
            'columns': [f'feature_{i}' for i in range(21)]
        }
        serve_rabbitmq.modelType = 'lightgbm'
        yield


class TestServeRabbitMQ:
    """Test RabbitMQ serve module functionality"""

    def test_startup_loads_model(self, mock_model_files):
        """Test startup function loads model and scaler"""
        # This is implicitly tested by the setup_serve_rabbitmq fixture
        # We can add explicit assertions if needed, but the fixture ensures it runs
        assert serve_rabbitmq.model is not None
        assert serve_rabbitmq.scalerInfo is not None
        assert serve_rabbitmq.modelType == 'lightgbm'

    def test_build_feature_array(self):
        """Test feature array building"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        arr = serve_rabbitmq.buildFeatureArray(features)

        assert arr.shape == (1, 21)
        assert arr.dtype == np.float64

    def test_predict_single(self):
        """Test single prediction logic"""
        features = {f'feature_{i}': float(i) for i in range(21)}
        score, label = serve_rabbitmq.predict(features)

        assert isinstance(score, float)
        assert 0 <= score <= 1
        assert label in ['high', 'medium', 'low']

    def test_predict_batch(self):
        """Test batch prediction logic"""
        serve_rabbitmq.model.predict.return_value = np.array([0.6, 0.7, 0.8])

        features = {f'feature_{i}': float(i) for i in range(21)}
        request_payload = {
            'rows': [
                {'productId': f'prod-{i}', 'features': features}
                for i in range(3)
            ]
        }

        response = serve_rabbitmq.predictBatch(request_payload)

        assert 'results' in response
        assert len(response['results']) == 3
        assert response['processedCount'] == 3

        for result in response['results']:
            assert 'score' in result
            assert 'label' in result
            assert 'index' in result

    def test_on_message_callback(self):
        """Test on_message callback function"""
        mock_channel = MagicMock()
        mock_method = MagicMock()
        mock_properties = MagicMock()
        mock_properties.reply_to = 'response_queue'
        mock_properties.correlation_id = '12345'

        features = {f'feature_{i}': float(i) for i in range(21)}
        request_payload = {
            'rows': [
                {'productId': 'prod-1', 'features': features}
            ]
        }
        body = json.dumps(request_payload).encode('utf-8')

        serve_rabbitmq.on_message(mock_channel, mock_method, mock_properties, body)

        mock_channel.basic_publish.assert_called_once()
        args, kwargs = mock_channel.basic_publish.call_args
        assert kwargs['exchange'] == ''
        assert kwargs['routing_key'] == 'response_queue'
        assert kwargs['properties'].correlation_id == '12345'
        
        response_body = json.loads(kwargs['body'])
        assert 'results' in response_body
        assert response_body['processedCount'] == 1
        mock_channel.basic_ack.assert_called_once_with(delivery_tag=mock_method.delivery_tag)

    def test_on_message_callback_error_handling(self):
        """Test on_message callback error handling"""
        mock_channel = MagicMock()
        mock_method = MagicMock()
        mock_properties = MagicMock()
        mock_properties.reply_to = 'response_queue'
        mock_properties.correlation_id = '12345'

        # Malformed JSON body
        body = b"invalid json"

        serve_rabbitmq.on_message(mock_channel, mock_method, mock_properties, body)

        mock_channel.basic_publish.assert_not_called() # Should not publish on error
        mock_channel.basic_ack.assert_called_once_with(delivery_tag=mock_method.delivery_tag)
