import pika
import json
import uuid

class RabbitMQTest:
    def __init__(self, host='localhost'):
        self.host = host
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(host=self.host))
        self.channel = self.connection.channel()
        result = self.channel.queue_declare(queue='', exclusive=True)
        self.callback_queue = result.method.queue
        self.channel.basic_consume(
            queue=self.callback_queue,
            on_message_callback=self.on_response,
            auto_ack=True)
        self.response = None
        self.corr_id = None

    def on_response(self, ch, method, props, body):
        if self.corr_id == props.correlation_id:
            self.response = body

    def call(self, message):
        self.response = None
        self.corr_id = str(uuid.uuid4())
        self.channel.basic_publish(
            exchange='',
            routing_key='prediction_requests',
            properties=pika.BasicProperties(
                reply_to=self.callback_queue,
                correlation_id=self.corr_id,
            ),
            body=json.dumps(message))
        while self.response is None:
            self.connection.process_data_events()
        return json.loads(self.response)

if __name__ == '__main__':
    test = RabbitMQTest()
    message = {
        "data": {
            "rows": [
                {
                    "productId": "123",
                    "storeId": "456",
                    "history": [
                        {
                            "date": "2025-11-01T00:00:00Z",
                            "purchases": 10,
                            "views": 100,
                            "revenue": 1000,
                            "inventoryQty": 50
                        },
                        {
                            "date": "2025-11-02T00:00:00Z",
                            "purchases": 12,
                            "views": 120,
                            "revenue": 1200,
                            "inventoryQty": 38
                        }
                    ]
                }
            ]
        }
    }
    response = test.call(message)
    print("Response:")
    print(response)
