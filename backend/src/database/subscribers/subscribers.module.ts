import { Module } from '@nestjs/common';
import { ProductStatsSubscriber } from './product-stats.subscriber';
import { LikeCountSubscriber } from './like-count.subscriber';
import { StoreProductCountSubscriber } from './store-product-count.subscriber';
import { StoreRevenueSubscriber } from './store-revenue.subscriber';
import { AnalyticsSyncSubscriber } from './analytics-sync.subscriber';
import { FollowerSubscriber } from 'src/database/subscribers/follower.subscriber';

@Module({
  providers: [
    ProductStatsSubscriber,
    FollowerSubscriber,
    LikeCountSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
    AnalyticsSyncSubscriber,
  ],
  exports: [
    ProductStatsSubscriber,
    LikeCountSubscriber,
    FollowerSubscriber,
    StoreProductCountSubscriber,
    StoreRevenueSubscriber,
    AnalyticsSyncSubscriber,
  ],
})
export class SubscribersModule {}
