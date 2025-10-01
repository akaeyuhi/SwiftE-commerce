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
import { ConfigModule } from '@nestjs/config';
import { REVIEWS_REPOSITORY } from 'src/common/contracts/reviews.contract';
import { AnalyticsReviewsRepository } from 'src/modules/analytics/repositories/reviews-data.repository';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, HttpModule],
  providers: [
    AnalyticsService,
    AnalyticsEventRepository,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
    { provide: REVIEWS_REPOSITORY, useExisting: AnalyticsReviewsRepository },
  ],
  controllers: [EventsController, AnalyticsController, AdminStatsController],
  exports: [
    AnalyticsService,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
  ],
})
export class AnalyticsModule {}
