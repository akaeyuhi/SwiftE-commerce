import { Module } from '@nestjs/common';
import { ProductStatsSubscriber } from './product-stats.subscriber';
import { LikeCountSubscriber } from './like-count.subscriber';
import { StoreProductCountSubscriber } from './store-product-count.subscriber';
import { StoreRevenueSubscriber } from './store-revenue.subscriber';
import { AnalyticsSyncSubscriber } from './analytics-sync.subscriber';

@Module({
  providers: [
    ProductStatsSubscriber,
    LikeCountSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
    AnalyticsSyncSubscriber,
  ],
  exports: [
    ProductStatsSubscriber,
    LikeCountSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
    AnalyticsSyncSubscriber,
  ],
})
export class SubscribersModule {}
