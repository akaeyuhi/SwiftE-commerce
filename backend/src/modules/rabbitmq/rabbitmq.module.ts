import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PREDICTOR_SERVICE } from 'src/common/constants/services';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PREDICTOR_SERVICE,
      useFactory: (configService: ConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${configService.get('RABBITMQ_USER')}:${configService.get('RABBITMQ_PASS')}@${configService.get('RABBITMQ_HOST')}:${configService.get('RABBITMQ_PORT')}`,
            ],
            queue: 'prediction_requests',
            queueOptions: {
              durable: true,
            },
          },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [PREDICTOR_SERVICE],
})
export class RabbitMQModule {}
