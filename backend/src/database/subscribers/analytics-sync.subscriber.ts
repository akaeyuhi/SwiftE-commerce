/* eslint-disable prettier/prettier */
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { AnalyticsEvent, AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { InjectDataSource } from '@nestjs/typeorm';

@EventSubscriber()
@Injectable()
export class AnalyticsSyncSubscriber
  implements EntitySubscriberInterface<AnalyticsEvent> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return AnalyticsEvent;
  }

  /**
   * After analytics event is recorded, update cached stats
   */
  async afterInsert(event: InsertEvent<AnalyticsEvent>): Promise<void> {
    const { manager, entity } = event;

    try {
      // Update product stats
      if (entity.productId) {
        await this.updateProductStats(manager, entity);
      }

      // Update store stats (if it's a store-level event)
      if (entity.storeId && entity.invokedOn === 'store') {
        await this.updateStoreStats(manager, entity);
      }
    } catch (error) {
      console.error('Error syncing analytics to cached stats:', error);
      // Don't throw - analytics failure shouldn't break the main operation
    }
  }

  /**
   * Update product cached statistics based on event type
   */
  private async updateProductStats(manager: any, event: AnalyticsEvent) {
    const updates: any = {};

    switch (event.eventType) {
      case AnalyticsEventType.VIEW:
        updates.viewCount = () => 'view_count + 1';
        break;

      case AnalyticsEventType.LIKE:
        updates.likeCount = () => 'like_count + 1';
        break;

      case AnalyticsEventType.UNLIKE:
        updates.likeCount = () => 'GREATEST(like_count - 1, 0)';
        break;

      case AnalyticsEventType.PURCHASE:
        updates.totalSales = () => 'total_sales + 1';
        break;
    }

    if (Object.keys(updates).length > 0) {
      await manager
        .createQueryBuilder()
        .update(Product)
        .set(updates)
        .where('id = :productId', { productId: event.productId })
        .execute();
    }
  }

  /**
   * Update store cached statistics based on event type
   */
  private async updateStoreStats(manager: any, event: AnalyticsEvent) {
    const updates: any = {};

    switch (event.eventType) {
      case AnalyticsEventType.VIEW:
        // Store views are typically tracked at product level
        break;

      case AnalyticsEventType.PURCHASE:
        // Revenue and order count are updated by Order subscribers
        break;
    }

    if (Object.keys(updates).length > 0) {
      await manager
        .createQueryBuilder()
        .update(Store)
        .set(updates)
        .where('id = :storeId', { storeId: event.storeId })
        .execute();
    }
  }
}
