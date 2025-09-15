import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { EventsController } from './events.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminStatsController } from 'src/modules/analytics/admin-stats.controller';
import { AiStatsRepository } from 'src/modules/analytics/repositories/ai-stats.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AnalyticsService,
    AnalyticsEventRepository,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
    AiStatsRepository,
  ],
  controllers: [EventsController, AnalyticsController, AdminStatsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
