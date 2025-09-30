import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { EventsController } from 'src/modules/analytics/controllers/events.controller';
import { AnalyticsController } from 'src/modules/analytics/controllers/analytics.controller';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminStatsController } from 'src/modules/analytics/controllers/admin-stats.controller';
import { HttpModule } from '@nestjs/axios';
import { ReviewsModule } from 'src/modules/products/reviews/reviews.module';
import { AiModule } from 'src/modules/ai/ai.module';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AnalyticsQueueService } from 'src/modules/analytics/queues/analytics-queue.service';
import { RecordEventInterceptor } from 'src/modules/analytics/interceptors/record-event.interceptor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    BullModule.registerQueueAsync({
      name: 'analytics',
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') ?? undefined;
        if (redisUrl) {
          return { redis: redisUrl };
        }
        return {
          redis: {
            host: config.get<string>('REDIS_HOST') ?? '127.0.0.1',
            port: Number(config.get<number>('REDIS_PORT') ?? 6379),
            password: config.get<string>('REDIS_PASSWORD') ?? undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    HttpModule,
    AiModule,
    ReviewsModule,
    PolicyModule,
  ],
  providers: [
    AnalyticsService,
    AnalyticsEventRepository,
    AnalyticsQueueService,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
    RecordEventInterceptor,
  ],
  controllers: [EventsController, AnalyticsController, AdminStatsController],
  exports: [
    AnalyticsService,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
    AnalyticsQueueService,
    RecordEventInterceptor,
  ],
})
export class AnalyticsModule {}
