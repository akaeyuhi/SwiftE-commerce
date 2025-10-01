import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsQueueModule } from './analytics-queue/analytics-queue.module';
import { EmailQueueModule } from 'src/modules/infrastructure/queues/email-queue/email-queue.module';

/**
 * QueuesModule (Global)
 *
 * Provides all queue infrastructure globally.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return { redis: redisUrl };
        }
        return {
          redis: {
            host: config.get<string>('REDIS_HOST') || '127.0.0.1',
            port: config.get<number>('REDIS_PORT') || 6379,
            password: config.get<string>('REDIS_PASSWORD'),
          },
        };
      },
    }),

    AnalyticsQueueModule,
    EmailQueueModule,
  ],
  exports: [BullModule, AnalyticsQueueModule, EmailQueueModule],
})
export class QueuesModule {}
