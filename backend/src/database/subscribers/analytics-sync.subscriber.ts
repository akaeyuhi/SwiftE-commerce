/* eslint-disable prettier/prettier */
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  DataSource,
  EntityManager,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Product } from 'src/entities/store/product/product.entity';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { SeedingContextService } from 'src/database/subscribers/seeding-context.service';
import { StoreDailyStats } from 'src/entities/infrastructure/analytics/store-daily-stats.entity';
import { Store } from 'src/entities/store/store.entity';
import { Order } from 'src/entities/store/product/order.entity';

@EventSubscriber()
@Injectable()
export class AnalyticsSyncSubscriber
    implements EntitySubscriberInterface<AnalyticsEvent> {
  constructor(
      @InjectDataSource() dataSource: DataSource,
      private readonly seedingContext: SeedingContextService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return AnalyticsEvent;
  }

  /**
   * After analytics event is recorded, verify and sync cached stats
   */
  async afterInsert(event: InsertEvent<AnalyticsEvent>): Promise<void> {
    // Skip during seeding to prevent heavy write loads
    if (this.seedingContext.isSeedingInProgress()) {
      return;
    }

    const { manager, entity } = event;

    try {
      // Sync product stats if the event relates to a product
      if (entity.productId) {
        await this.syncProductStats(manager, entity.productId);
      }

      // Sync store stats if the event relates to a store (directly or via product)
      if (entity.storeId) {
        await this.syncStoreStats(manager, entity.storeId);
      }
    } catch (error) {
      console.error('Error syncing analytics to cached stats:', error);
    }
  }

  /**
   * Recalculate product statistics from source of truth and update if mismatched
   */
  private async syncProductStats(manager: EntityManager, productId: string) {
    // 1. Calculate actual counts from the analytics table
    const [viewCount, purchaseCount, likeCount, unlikeCount] = await Promise.all([
      manager.count(AnalyticsEvent, {
        where: { productId, eventType: AnalyticsEventType.VIEW },
      }),
      manager.count(AnalyticsEvent, {
        where: { productId, eventType: AnalyticsEventType.PURCHASE },
      }),
      manager.count(AnalyticsEvent, {
        where: { productId, eventType: AnalyticsEventType.LIKE },
      }),
      manager.count(AnalyticsEvent, {
        where: { productId, eventType: AnalyticsEventType.UNLIKE },
      }),
    ]);

    const netLikes = Math.max(0, likeCount - unlikeCount);

    // 2. Update Product only if values differ (Check for Mismatch)
    await manager
        .createQueryBuilder()
        .update(Product)
        .set({
          viewCount,
          totalSales: purchaseCount,
          likeCount: netLikes,
        })
        .where('id = :productId', { productId })
        .andWhere(
            `("viewCount" != :viewCount OR "totalSales" != :purchaseCount OR "likeCount" != :netLikes)`,
            { viewCount, purchaseCount, netLikes },
        )
        .execute();
  }

  /**
   * Recalculate store statistics from source of truth and update if mismatched
   */
  private async syncStoreStats(manager: EntityManager, storeId: string) {
    // 1. Calculate actual view count and revenue from analytics events
    const qb = manager.getRepository(StoreDailyStats)
        .createQueryBuilder('s')
        .select([
          'COALESCE(SUM(s.views), 0) as views',
          'COALESCE(SUM(s.purchases), 0) as purchases',
          'COALESCE(SUM(s.revenue), 0) as revenue',
        ])
        .where('s.storeId = :storeId', { storeId });

    const raw = await qb.getRawOne();

    const { views, purchases, revenue } = raw;
    const conversionRate = views > 0 ? purchases / views : 0;
    const viewCount = views;
    const orderCount = await manager.count(Order, {
      where: { storeId },
    });
    const totalRevenue = revenue;

    await manager
        .createQueryBuilder()
        .update(Store)
        .set({
          viewCount,
          orderCount,
          totalRevenue,
          conversionRate
        })
        .where('id = :storeId', { storeId })
        .andWhere(
            `("viewCount" != :viewCount OR
          "totalRevenue" != :totalRevenue OR
          "conversionRate" != (CASE WHEN :viewCount > 0 THEN LEAST(999.99, ROUND(("orderCount"::numeric / :viewCount::numeric * 100)::numeric, 2)) ELSE 0 END))`,
            { viewCount, totalRevenue },
        )
        .execute();
  }
}
