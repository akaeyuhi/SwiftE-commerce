import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  UpdateEvent,
} from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SeedingContextService } from './seeding-context.service';

/* eslint-disable prettier/prettier */
@EventSubscriber()
@Injectable()
export class StoreConversionRateSubscriber
    implements EntitySubscriberInterface<Store> {
  constructor(
      @InjectDataSource() dataSource: DataSource,
      private readonly seedingContext: SeedingContextService
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Store;
  }

  /**
   * After a store's viewCount is updated, recalculate the conversion rate.
   * NOTE: orderCount updates are handled by StoreRevenueSubscriber
   */
  async afterUpdate(event: UpdateEvent<Store>): Promise<void> {
    // Skip during seeding
    if (this.seedingContext.isSeedingInProgress()) {
      return;
    }

    const { entity, manager, updatedColumns } = event;

    if (!entity) {
      return;
    }

    // Skip if conversion rate itself was just updated (prevent infinite loop)
    if (updatedColumns.some((col) => col.propertyName === 'conversionRate')) {
      return;
    }

    // Only recalculate when viewCount changes
    // (orderCount changes are handled by StoreRevenueSubscriber)
    const viewCountChanged = updatedColumns.some(
        (col) => col.propertyName === 'viewCount'
    );

    if (viewCountChanged) {
      try {
        await manager
            .createQueryBuilder()
            .update(Store)
            .set({
              conversionRate: () =>
                  `CASE WHEN "viewCount" > 0 THEN ROUND(("orderCount"::numeric / "viewCount"::numeric * 100)::numeric, 2) ELSE 0 END`,
            })
            .where('id = :id', { id: entity.id })
            .execute();
      } catch (error) {
        console.error('Error updating store conversion rate:', error);
      }
    }
  }
}
