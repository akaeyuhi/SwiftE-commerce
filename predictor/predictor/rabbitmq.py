"""
RabbitMQ client for predictor service
"""
import logging
import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties
from typing import Callable

logger = logging.getLogger(__name__)


class RabbitMQ:
    """A blocking RabbitMQ client."""

    def __init__(self, host: str = "localhost", port: int = 5672):
        self.host = host
        self.port = port
        self._connection = None
        self._channel = None

    def connect(self):
        """Connect to RabbitMQ."""
        logger.info(f"Connecting to RabbitMQ at {self.host}:{self.port}")
        try:
            self._connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=self.host, port=self.port)
            )
            self._channel = self._connection.channel()
            logger.info("Successfully connected to RabbitMQ")
        except pika.exceptions.AMQPConnectionError as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise

    def disconnect(self):
        """Disconnect from RabbitMQ."""
        if self._connection and not self._connection.is_closed:
            self._connection.close()
            logger.info("Disconnected from RabbitMQ")

    def declare_queue(self, queue_name: str):
        """Declare a queue."""
        if not self._channel:
            raise ConnectionError("Not connected to RabbitMQ")
        self._channel.queue_declare(queue=queue_name, durable=True)
        logger.info(f"Queue '{queue_name}' declared")

    def publish(self, queue_name: str, body: bytes):
        """Publish a message to a queue."""
        if not self._channel:
            raise ConnectionError("Not connected to RabbitMQ")
        self._channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=body,
            properties=pika.BasicProperties(delivery_mode=2),  # make message persistent
        )
        logger.debug(f"Published message to queue '{queue_name}'")

    def consume(
        self,
        queue_name: str,
        callback: Callable[[BlockingChannel, Basic.Deliver, BasicProperties, bytes], None],
    ):
        """Consume messages from a queue."""
        if not self._channel:
            raise ConnectionError("Not connected to RabbitMQ")
        self._channel.basic_qos(prefetch_count=1)
        self.declare_queue(queue_name)
        self._channel.basic_consume(queue=queue_name, on_message_callback=callback)
        logger.info(f"Waiting for messages on queue '{queue_name}'. To exit press CTRL+C")
        try:
            self._channel.start_consuming()
        except KeyboardInterrupt:
            self._channel.stop_consuming()
            self.disconnect()
