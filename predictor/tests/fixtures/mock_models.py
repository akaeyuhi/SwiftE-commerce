"""
Mock models and fixtures for testing ML components
"""
import numpy as np
from unittest.mock import Mock, MagicMock
from typing import Optional, Dict, Any, List
import joblib
from pathlib import Path


class MockLightGBMModel:
    """Mock LightGBM Booster model for testing"""

    def __init__(
        self,
        best_iteration: int = 100,
        best_score: Optional[Dict[str, Any]] = None,
        feature_importance: Optional[np.ndarray] = None,
        num_features: int = 21
    ):
        self.best_iteration = best_iteration
        self.best_score = best_score or {
            'valid': {
                'auc': 0.85,
                'binary_logloss': 0.35
            }
        }
        self.num_features = num_features
        self._feature_importance = feature_importance
        self._num_trees = best_iteration

    def predict(
        self,
        data: np.ndarray,
        num_iteration: Optional[int] = None,
        **kwargs
    ) -> np.ndarray:
        """Mock prediction method"""
        if isinstance(data, np.ndarray):
            n_samples = data.shape[0]
        else:
            n_samples = len(data)

        # Return random predictions between 0 and 1
        return np.random.rand(n_samples)

    def save_model(self, filename: str, **kwargs) -> None:
        """Mock save method"""
        # Create a simple text file to simulate saving
        with open(filename, 'w') as f:
            f.write(f"MockLightGBM Model\n")
            f.write(f"Best Iteration: {self.best_iteration}\n")
            f.write(f"Features: {self.num_features}\n")

    def feature_importance(
        self,
        importance_type: str = 'split'
    ) -> np.ndarray:
        """Mock feature importance"""
        if self._feature_importance is not None:
            return self._feature_importance
        return np.random.randint(0, 100, self.num_features)

    def feature_name(self) -> List[str]:
        """Mock feature names"""
        return [f'feature_{i}' for i in range(self.num_features)]

    @property
    def num_trees(self) -> int:
        """Number of trees in the model"""
        return self._num_trees


class MockKerasModel:
    """Mock Keras/TensorFlow model for testing"""

    def __init__(
        self,
        input_shape: tuple = (21,),
        output_shape: tuple = (1,),
        compiled: bool = True
    ):
        self.input_shape = input_shape
        self.output_shape = output_shape
        self.compiled = compiled
        self.layers = []
        self._history = None

        # Mock layers
        self._create_mock_layers()

    def _create_mock_layers(self):
        """Create mock layer structure"""
        # Input layer
        input_layer = Mock()
        input_layer.units = self.input_shape[0]
        input_layer.activation = Mock(__name__='relu')
        self.layers.append(input_layer)

        # Hidden layers
        for units in [128, 64]:
            layer = Mock()
            layer.units = units
            layer.activation = Mock(__name__='relu')
            self.layers.append(layer)

        # Output layer
        output_layer = Mock()
        output_layer.units = self.output_shape[0]
        output_layer.activation = Mock(__name__='sigmoid')
        self.layers.append(output_layer)

    def predict(
        self,
        x: np.ndarray,
        batch_size: Optional[int] = None,
        verbose: int = 0,
        **kwargs
    ) -> np.ndarray:
        """Mock prediction method"""
        n_samples = x.shape[0]

        # Return predictions with shape (n_samples, 1)
        predictions = np.random.rand(n_samples, 1)
        return predictions

    def fit(
        self,
        x: np.ndarray,
        y: np.ndarray,
        batch_size: Optional[int] = None,
        epochs: int = 10,
        verbose: int = 1,
        validation_data: Optional[tuple] = None,
        callbacks: Optional[List] = None,
        **kwargs
    ):
        """Mock training method"""
        # Simulate training history
        history = {
            'loss': list(np.random.rand(epochs)),
            'auc': list(np.random.rand(epochs)),
            'val_loss': list(np.random.rand(epochs)),
            'val_auc': list(np.random.rand(epochs))
        }

        self._history = Mock()
        self._history.history = history

        return self._history

    def save(self, filepath: str, **kwargs) -> None:
        """Mock save method"""
        # Create a directory if saving as directory
        path = Path(filepath)
        if path.suffix == '':
            path.mkdir(parents=True, exist_ok=True)
            model_file = path / 'saved_model.pb'
            model_file.touch()
        else:
            # Create parent directory
            path.parent.mkdir(parents=True, exist_ok=True)
            path.touch()

    def compile(
        self,
        optimizer: str = 'adam',
        loss: str = 'binary_crossentropy',
        metrics: Optional[List] = None,
        **kwargs
    ) -> None:
        """Mock compile method"""
        self.compiled = True
        self.optimizer = optimizer
        self.loss = loss
        self.metrics = metrics or []

    def summary(self, print_fn=None):
        """Mock summary method"""
        summary_str = f"Model: Sequential\n"
        summary_str += f"Total params: {sum(layer.units for layer in self.layers)}\n"

        if print_fn:
            print_fn(summary_str)
        else:
            print(summary_str)

    def evaluate(
        self,
        x: np.ndarray,
        y: np.ndarray,
        batch_size: Optional[int] = None,
        verbose: int = 1,
        **kwargs
    ) -> List[float]:
        """Mock evaluation method"""
        return [0.35, 0.85]  # [loss, auc]


class MockScaler:
    """Mock StandardScaler for testing"""

    def __init__(
        self,
        mean: Optional[np.ndarray] = None,
        std: Optional[np.ndarray] = None,
        n_features: int = 21
    ):
        self.mean_ = mean if mean is not None else np.zeros(n_features)
        self.scale_ = std if std is not None else np.ones(n_features)
        self.n_features_in_ = n_features
        self.fitted = False

    def fit(self, X: np.ndarray) -> 'MockScaler':
        """Mock fit method"""
        self.mean_ = X.mean(axis=0)
        self.scale_ = X.std(axis=0)
        self.n_features_in_ = X.shape[1]
        self.fitted = True
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Mock transform method"""
        if not self.fitted and not hasattr(self, 'mean_'):
            # If not fitted, just return the data
            return X

        # Simple standardization
        return (X - self.mean_) / (self.scale_ + 1e-8)

    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """Mock fit_transform method"""
        self.fit(X)
        return self.transform(X)

    def inverse_transform(self, X: np.ndarray) -> np.ndarray:
        """Mock inverse transform"""
        return X * self.scale_ + self.mean_


class MockDataLoader:
    """Mock DataLoader for testing"""

    def __init__(
        self,
        products_data: Optional[Any] = None,
        stats_data: Optional[Any] = None
    ):
        self.products_data = products_data
        self.stats_data = stats_data

    def loadProducts(
        self,
        productIds: Optional[List[str]] = None
    ):
        """Mock load products"""
        if self.products_data is not None:
            return self.products_data

        import pandas as pd
        return pd.DataFrame({
            'id': ['prod-1', 'prod-2'],
            'storeId': ['store-1', 'store-1']
        })

    def loadProductDailyStats(
        self,
        startDate: str,
        endDate: str,
        productIds: Optional[List[str]] = None
    ):
        """Mock load product stats"""
        if self.stats_data is not None:
            return self.stats_data

        import pandas as pd
        dates = pd.date_range(startDate, endDate, freq='D')

        data = []
        for product_id in ['prod-1', 'prod-2']:
            for date in dates:
                data.append({
                    'productId': product_id,
                    'date': date,
                    'views': np.random.randint(50, 200),
                    'purchases': np.random.randint(5, 20),
                    'addToCarts': np.random.randint(10, 40),
                    'revenue': np.random.uniform(100, 500)
                })

        return pd.DataFrame(data)

    def loadStoreDailyStats(
        self,
        startDate: str,
        endDate: str,
        storeIds: Optional[List[str]] = None
    ):
        """Mock load store stats"""
        import pandas as pd
        dates = pd.date_range(startDate, endDate, freq='D')

        data = []
        for store_id in ['store-1', 'store-2']:
            for date in dates:
                data.append({
                    'storeId': store_id,
                    'date': date,
                    'views': np.random.randint(500, 2000),
                    'purchases': np.random.randint(50, 200),
                    'addToCarts': np.random.randint(100, 400),
                    'revenue': np.random.uniform(1000, 5000),
                    'checkouts': np.random.randint(80, 300)
                })

        return pd.DataFrame(data)

    def loadVariants(self, productIds: Optional[List[str]] = None):
        """Mock load variants"""
        import pandas as pd
        return pd.DataFrame({
            'id': ['var-1', 'var-2'],
            'productId': ['prod-1', 'prod-1'],
            'price': [29.99, 39.99]
        })

    def loadInventory(self, variantIds: Optional[List[str]] = None):
        """Mock load inventory"""
        import pandas as pd
        dates = pd.date_range('2025-01-01', periods=10, freq='D')

        data = []
        for variant_id in ['var-1', 'var-2']:
            for date in dates:
                data.append({
                    'id': f'inv-{variant_id}-{date}',
                    'variantId': variant_id,
                    'quantity': np.random.randint(50, 500),
                    'updatedAt': date
                })

        return pd.DataFrame(data)

    def loadReviews(
        self,
        startDate: str,
        endDate: str,
        productIds: Optional[List[str]] = None
    ):
        """Mock load reviews"""
        import pandas as pd
        dates = pd.date_range(startDate, endDate, freq='H')

        data = []
        for i, date in enumerate(dates):
            data.append({
                'id': f'review-{i}',
                'productId': np.random.choice(['prod-1', 'prod-2']),
                'rating': np.random.randint(1, 6),
                'createdAt': date
            })

        return pd.DataFrame(data)


class MockEngine:
    """Mock SQLAlchemy engine for testing"""

    def __init__(self):
        self.connection = Mock()
        self.dialect = Mock()
        self.dialect.name = 'postgresql'

    def connect(self):
        """Mock connect method"""
        return self.connection

    def execute(self, *args, **kwargs):
        """Mock execute method"""
        return Mock()

    def dispose(self):
        """Mock dispose method"""
        pass


def create_mock_lightgbm_model(
    n_samples: int = 100,
    n_features: int = 21,
    best_iteration: int = 100,
    auc_score: float = 0.85
) -> MockLightGBMModel:
    """
    Factory function to create mock LightGBM model

    Args:
        n_samples: Number of samples for prediction tests
        n_features: Number of features
        best_iteration: Best iteration number
        auc_score: Mock AUC score

    Returns:
        MockLightGBMModel instance
    """
    return MockLightGBMModel(
        best_iteration=best_iteration,
        best_score={'valid': {'auc': auc_score, 'binary_logloss': 1 - auc_score}},
        num_features=n_features
    )


def create_mock_keras_model(
    input_shape: tuple = (21,),
    hidden_layers: List[int] = None
) -> MockKerasModel:
    """
    Factory function to create mock Keras model

    Args:
        input_shape: Input shape
        hidden_layers: Hidden layer sizes

    Returns:
        MockKerasModel instance
    """
    if hidden_layers is None:
        hidden_layers = [128, 64]

    return MockKerasModel(input_shape=input_shape)


def create_mock_scaler(n_features: int = 21) -> MockScaler:
    """
    Factory function to create mock scaler

    Args:
        n_features: Number of features

    Returns:
        MockScaler instance
    """
    return MockScaler(n_features=n_features)


def save_mock_model_files(
    model_dir: Path,
    model_type: str = 'lightgbm',
    n_features: int = 21
) -> Dict[str, Path]:
    """
    Save mock model files to disk for testing

    Args:
        model_dir: Directory to save files
        model_type: 'lightgbm' or 'keras'
        n_features: Number of features

    Returns:
        Dictionary with paths to created files
    """
    model_dir.mkdir(parents=True, exist_ok=True)

    # Create scaler file
    scaler_path = model_dir / 'scaler.pkl'
    scaler_obj = {
        'scaler': create_mock_scaler(n_features),
        'columns': [f'feature_{i}' for i in range(n_features)]
    }
    joblib.dump(scaler_obj, scaler_path)

    files = {'scaler': scaler_path}

    if model_type == 'lightgbm':
        # Create mock model file
        model_path = model_dir / 'model.bin'
        with open(model_path, 'w') as f:
            f.write("Mock LightGBM Model\n")
            f.write(f"Features: {n_features}\n")
        files['model'] = model_path

    elif model_type == 'keras':
        # Create mock Keras directory
        model_path = model_dir / 'model.h5'
        model_path.touch()
        files['model'] = model_path

    return files


class MockPredictor:
    """Mock predictor for API testing"""

    def __init__(
        self,
        model_type: str = 'lightgbm',
        default_score: float = 0.75
    ):
        self.model_type = model_type
        self.default_score = default_score

        if model_type == 'lightgbm':
            self.model = create_mock_lightgbm_model()
        else:
            self.model = create_mock_keras_model()

        self.scaler = create_mock_scaler()

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Mock single prediction"""
        score = self.default_score + np.random.uniform(-0.1, 0.1)
        score = np.clip(score, 0, 1)

        if score > 0.7:
            label = 'high'
        elif score > 0.4:
            label = 'medium'
        else:
            label = 'low'

        return {
            'score': float(score),
            'label': label,
            'modelVersion': 'v1.0-mock'
        }

    def predict_batch(
        self,
        features_list: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Mock batch prediction"""
        return [
            {
                **self.predict(features),
                'index': i
            }
            for i, features in enumerate(features_list)
        ]


class MockFastAPIClient:
    """Mock FastAPI test client for testing"""

    def __init__(self, predictor: Optional[MockPredictor] = None):
        self.predictor = predictor or MockPredictor()
        self.base_url = 'http://testserver'

    def get(self, path: str, **kwargs):
        """Mock GET request"""
        response = Mock()

        if path == '/':
            response.status_code = 200
            response.json.return_value = {
                'service': 'Stockout Predictor',
                'version': 'v1.0-mock'
            }

        elif path == '/health':
            response.status_code = 200
            response.json.return_value = {
                'status': 'healthy',
                'modelType': 'lightgbm',
                'featuresCount': 21
            }

        else:
            response.status_code = 404
            response.json.return_value = {'detail': 'Not found'}

        return response

    def post(self, path: str, json: Dict = None, headers: Dict = None, **kwargs):
        """Mock POST request"""
        response = Mock()

        # Check auth
        if headers and headers.get('X-Internal-Token') != 'test-token':
            response.status_code = 401
            response.json.return_value = {'detail': 'Unauthorized'}
            return response

        if path == '/predict':
            if not json or 'features' not in json:
                response.status_code = 400
                response.json.return_value = {'detail': 'Missing features'}
            else:
                response.status_code = 200
                result = self.predictor.predict(json['features'])
                result['productId'] = json.get('productId')
                result['storeId'] = json.get('storeId')
                response.json.return_value = result

        elif path == '/predict_batch':
            if not json or 'rows' not in json:
                response.status_code = 400
                response.json.return_value = {'detail': 'Missing rows'}
            elif len(json['rows']) == 0:
                response.status_code = 400
                response.json.return_value = {'detail': 'Empty batch'}
            elif len(json['rows']) > 1000:
                response.status_code = 400
                response.json.return_value = {'detail': 'Batch too large'}
            else:
                response.status_code = 200
                features_list = [row['features'] for row in json['rows']]
                results = self.predictor.predict_batch(features_list)

                # Add product/store IDs
                for i, row in enumerate(json['rows']):
                    results[i]['productId'] = row.get('productId')
                    results[i]['storeId'] = row.get('storeId')

                response.json.return_value = {
                    'results': results,
                    'modelVersion': 'v1.0-mock',
                    'processedCount': len(results)
                }

        else:
            response.status_code = 404
            response.json.return_value = {'detail': 'Not found'}

        return response


# Convenience functions for pytest fixtures

def get_mock_lightgbm():
    """Get mock LightGBM model for fixtures"""
    return create_mock_lightgbm_model()


def get_mock_keras():
    """Get mock Keras model for fixtures"""
    return create_mock_keras_model()


def get_mock_scaler():
    """Get mock scaler for fixtures"""
    return create_mock_scaler()


def get_mock_data_loader():
    """Get mock data loader for fixtures"""
    return MockDataLoader()


def get_mock_engine():
    """Get mock database engine for fixtures"""
    return MockEngine()


def get_mock_predictor():
    """Get mock predictor for fixtures"""
    return MockPredictor()


def get_mock_client():
    """Get mock FastAPI client for fixtures"""
    return MockFastAPIClient()
