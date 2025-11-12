"""
Unit tests for RabbitMQ client
"""
import pytest
from unittest.mock import MagicMock, patch
import pika
from predictor.rabbitmq import RabbitMQ


class TestRabbitMQ:
    """Test RabbitMQ client functionality"""

    @pytest.fixture
    def rabbitmq_client(self):
        """Fixture for RabbitMQ client"""
        with patch('pika.BlockingConnection') as mock_connection:
            client = RabbitMQ(host="test_host", port=5672)
            client._connection = mock_connection.return_value
            client._channel = mock_connection.return_value.channel.return_value
            yield client

    def test_connect_success(self, rabbitmq_client):
        """Test successful connection"""
        rabbitmq_client._connection.is_closed = False
        rabbitmq_client.connect()
        rabbitmq_client._connection.close.assert_not_called()
        rabbitmq_client._connection.channel.assert_called_once()

    def test_connect_failure(self):
        """Test connection failure"""
        with patch('pika.BlockingConnection', side_effect=pika.exceptions.AMQPConnectionError):
            client = RabbitMQ(host="test_host", port=5672)
            with pytest.raises(pika.exceptions.AMQPConnectionError):
                client.connect()

    def test_disconnect(self, rabbitmq_client):
        """Test disconnection"""
        rabbitmq_client._connection.is_closed = False
        rabbitmq_client.disconnect()
        rabbitmq_client._connection.close.assert_called_once()

    def test_declare_queue(self, rabbitmq_client):
        """Test queue declaration"""
        rabbitmq_client.declare_queue("test_queue")
        rabbitmq_client._channel.queue_declare.assert_called_once_with(queue="test_queue", durable=True)

    def test_publish(self, rabbitmq_client):
        """Test message publishing"""
        body = b"test_message"
        rabbitmq_client.publish("test_queue", body)
        rabbitmq_client._channel.basic_publish.assert_called_once_with(
            exchange="",
            routing_key="test_queue",
            body=body,
            properties=pika.BasicProperties(delivery_mode=2)
        )

    def test_consume(self, rabbitmq_client):
        """Test message consumption"""
        mock_callback = MagicMock()
        rabbitmq_client.consume("test_queue", mock_callback)
        rabbitmq_client._channel.basic_qos.assert_called_once_with(prefetch_count=1)
        rabbitmq_client._channel.basic_consume.assert_called_once_with(
            queue="test_queue", on_message_callback=mock_callback
        )
        rabbitmq_client._channel.start_consuming.assert_called_once()
