import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from '../repositories/store-daily-stats.repository';
import { Product } from 'entities/read-only/product.entity';

@Injectable()
export class DataSyncService {
  constructor(
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>
  ) {}

  async syncCachedStatsWithAnalytics(productId?: string, storeId?: string) {
    if (productId) {
      return this.syncProductStats(productId);
    }

    if (storeId) {
      return this.syncStoreStats(storeId);
    }

    return this.syncAllStats();
  }

  private async syncProductStats(productId: string) {
    const analytics = await this.eventsRepo.aggregateProductMetrics(
      productId,
      {}
    );

    await this.productRepo.update(productId, {
      viewCount: analytics.views || 0,
      totalSales: analytics.purchases || 0,
    });

    return { productId, synced: true };
  }

  private async syncStoreStats(storeId: string) {
    const analytics = await this.storeStatsRepo.getAggregatedMetrics(
      storeId,
      {}
    );

    return {
      storeId,
      analytics: {
        views: analytics.views,
        purchases: analytics.purchases,
        revenue: analytics.revenue,
      },
      message: 'Store stats are managed by triggers/subscribers',
    };
  }

  private async syncAllStats() {
    return {
      message: 'Full sync should be run as a background job',
      recommendation: 'Use a scheduled task or admin command',
    };
  }
}
