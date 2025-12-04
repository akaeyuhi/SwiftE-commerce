import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

import { EventTrackingService } from './services/event-tracking.service';
import { QuickStatsService } from './services/quick-stats.service';
import { ConversionAnalyticsService } from './services/conversion-analytics.service';
import { AnalyticsEvent } from 'entities/analytics-event.entity';
import { StoreDailyStats } from 'entities/store-daily-stats.entity';
import { ProductDailyStats } from 'entities/product-daily-stats.entity';
import { AnalyticsReviewsModule } from 'src/analytics-reviews/analytics-reviews.module';
import { Store } from 'entities/read-only/store.entity';
import { Product } from 'entities/read-only/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEvent,
      StoreDailyStats,
      ProductDailyStats,
      Store,
      Product,
    ]),
    AnalyticsReviewsModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    EventTrackingService,
    QuickStatsService,
    ConversionAnalyticsService,
  ],
})
export class AnalyticsModule {}
