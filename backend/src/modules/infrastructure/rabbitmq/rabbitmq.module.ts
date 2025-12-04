import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PREDICTOR_SERVICE } from 'src/common/constants/services';

// Define the injection token for the new microservice
export const ANALYTICS_MICROSERVICE = 'ANALYTICS_MICROSERVICE';

@Global() // Global makes it available everywhere without importing it in every feature module
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
    {
      provide: ANALYTICS_MICROSERVICE,
      useFactory: (configService: ConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${configService.get('RABBITMQ_USER')}:${configService.get('RABBITMQ_PASS')}@${configService.get('RABBITMQ_HOST')}:${configService.get('RABBITMQ_PORT')}`,
            ],
            queue: 'analytics_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [PREDICTOR_SERVICE, ANALYTICS_MICROSERVICE],
})
export class RabbitMQModule {}
