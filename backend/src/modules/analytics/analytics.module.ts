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
import { EventTrackingService } from 'src/modules/analytics/services/event-tracking.service';
import { QuickStatsService } from 'src/modules/analytics/services/quick-stats.service';
import { ConversionAnalyticsService } from 'src/modules/analytics/services/conversion-analytics.service';
import { RatingAnalyticsService } from 'src/modules/analytics/services/rating-analytics.service';
import { FunnelAnalyticsService } from 'src/modules/analytics/services/funnel-analytics.service';
import { ComparisonAnalyticsService } from 'src/modules/analytics/services/comparison-analytics.service';
import { PerformanceAnalyticsService } from 'src/modules/analytics/services/performance-analytics.service';
import { DataSyncService } from 'src/modules/analytics/services/data-sync.service';
import { HealthCheckService } from 'src/modules/analytics/services/health-check.service';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, HttpModule],
  providers: [
    AnalyticsService,

    AnalyticsEventRepository,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,

    EventTrackingService,
    QuickStatsService,
    ConversionAnalyticsService,
    RatingAnalyticsService,
    FunnelAnalyticsService,
    ComparisonAnalyticsService,
    PerformanceAnalyticsService,
    DataSyncService,
    HealthCheckService,
  ],
  controllers: [EventsController, AnalyticsController, AdminStatsController],
  exports: [
    AnalyticsService,
    StoreDailyStatsRepository,
    ProductDailyStatsRepository,
  ],
})
export class AnalyticsModule {}
