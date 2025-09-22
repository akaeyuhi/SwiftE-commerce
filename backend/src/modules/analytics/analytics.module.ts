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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    AiModule,
    ReviewsModule,
    PolicyModule,
  ],
  providers: [
    AnalyticsService,
    AnalyticsEventRepository,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
  ],
  controllers: [EventsController, AnalyticsController, AdminStatsController],
  exports: [
    AnalyticsService,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
  ],
})
export class AnalyticsModule {}
