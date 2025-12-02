import { Module } from '@nestjs/common';
import { ProductStatsSubscriber } from './product-stats.subscriber';
import { LikeCountSubscriber } from './like-count.subscriber';
import { StoreProductCountSubscriber } from './store-product-count.subscriber';
import { StoreRevenueSubscriber } from './store-revenue.subscriber';
import { AnalyticsSyncSubscriber } from './analytics-sync.subscriber';
import { FollowerSubscriber } from 'src/database/subscribers/follower.subscriber';
import { StoreConversionRateSubscriber } from './store-conversion-rate.subscriber';
import { SeedingContextService } from 'src/database/subscribers/seeding-context.service';

@Module({
  providers: [
    ProductStatsSubscriber,
    FollowerSubscriber,
    LikeCountSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
    AnalyticsSyncSubscriber,
    StoreConversionRateSubscriber,
    SeedingContextService,
  ],
  exports: [
    ProductStatsSubscriber,
    LikeCountSubscriber,
    FollowerSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
    AnalyticsSyncSubscriber,
    SeedingContextService,
    StoreConversionRateSubscriber,
  ],
})
export class SubscribersModule {}
