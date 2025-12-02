/* eslint-disable prettier/prettier */
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { Store } from 'src/entities/store/store.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SeedingContextService } from './seeding-context.service';

@EventSubscriber()
@Injectable()
export class StoreRevenueSubscriber
    implements EntitySubscriberInterface<Order> {
  constructor(
      @InjectDataSource() dataSource: DataSource,
      private readonly seedingContext: SeedingContextService
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Order;
  }

  async afterInsert(event: InsertEvent<Order>): Promise<void> {
    // Skip during seeding
    if (this.seedingContext.isSeedingInProgress()) {
      return;
    }

    const { manager, entity } = event;

    try {
      // Only count completed/shipped orders
      if (entity.status === OrderStatus.SHIPPED) {
        await this.incrementStoreStats(
            manager,
            entity.storeId,
            Number(entity.totalAmount)
        );
      }
    } catch (error) {
      console.error('Error updating store revenue on insert:', error);
    }
  }

  async afterUpdate(event: UpdateEvent<Order>): Promise<void> {
    // Skip during seeding
    if (this.seedingContext.isSeedingInProgress()) {
      return;
    }

    const { manager, entity, databaseEntity, updatedColumns } = event;

    if (!entity || !databaseEntity) return;

    // Check if status was actually updated
    const statusChanged = updatedColumns.some(
        (col) => col.propertyName === 'status'
    );

    if (!statusChanged) return;

    try {
      const oldStatus = databaseEntity.status;
      const newStatus = entity.status;

      // Order just completed/shipped
      if (
          oldStatus !== OrderStatus.SHIPPED &&
          newStatus === OrderStatus.SHIPPED
      ) {
        await this.incrementStoreStats(
            manager,
            entity.storeId,
            Number(entity.totalAmount)
        );
      }

      // Order refunded/cancelled (was completed, now not)
      if (
          oldStatus === OrderStatus.SHIPPED &&
          newStatus !== OrderStatus.SHIPPED
      ) {
        await this.decrementStoreStats(
            manager,
            entity.storeId,
            Number(entity.totalAmount)
        );
      }
    } catch (error) {
      console.error('Error updating store revenue on update:', error);
    }
  }

  /**
   * Increment store order count and revenue, then recalculate conversion rate
   */
  private async incrementStoreStats(
      manager: any,
      storeId: string,
      amount: number
  ): Promise<void> {
    await manager
        .createQueryBuilder()
        .update(Store)
        .set({
          orderCount: () => '"orderCount" + 1',
          totalRevenue: () => `"totalRevenue" + ${amount}`,
          conversionRate: () =>
              `CASE WHEN "viewCount" > 0 THEN ROUND((("orderCount" + 1)::numeric / "viewCount"::numeric * 100)::numeric, 2) ELSE 0 END`,
        })
        .where('id = :storeId', { storeId })
        .execute();
  }

  /**
   * Decrement store order count and revenue, then recalculate conversion rate
   */
  private async decrementStoreStats(
      manager: any,
      storeId: string,
      amount: number
  ): Promise<void> {
    await manager
        .createQueryBuilder()
        .update(Store)
        .set({
          orderCount: () => 'GREATEST("orderCount" - 1, 0)',
          totalRevenue: () => `GREATEST("totalRevenue" - ${amount}, 0)`,
          conversionRate: () =>
              `CASE WHEN "viewCount" > 0 THEN ROUND((GREATEST("orderCount" - 1, 0)::numeric / "viewCount"::numeric * 100)::numeric, 2) ELSE 0 END`,
        })
        .where('id = :storeId', { storeId })
        .execute();
  }
}
