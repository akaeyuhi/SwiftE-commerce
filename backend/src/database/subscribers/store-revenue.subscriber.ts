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

@EventSubscriber()
@Injectable()
export class StoreRevenueSubscriber
  implements EntitySubscriberInterface<Order> {
  constructor(private dataSource: DataSource) {
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return Order;
  }

  async afterInsert(event: InsertEvent<Order>): Promise<void> {
    const { manager, entity } = event;

    if (entity.status === OrderStatus.SHIPPED) {
      await manager.increment(Store, { id: entity.storeId }, 'orderCount', 1);
      await manager.increment(
        Store,
        { id: entity.storeId },
        'totalRevenue',
        Number(entity.totalAmount)
      );
    }
  }

  async afterUpdate(event: UpdateEvent<Order>): Promise<void> {
    const { manager, entity, databaseEntity } = event;

    if (!entity || !databaseEntity) return;

    const oldStatus = databaseEntity.status;
    const newStatus = entity.status;

    // Order just completed
    if (
      oldStatus !== OrderStatus.SHIPPED &&
      newStatus === OrderStatus.SHIPPED
    ) {
      await manager.increment(Store, { id: entity.storeId }, 'orderCount', 1);
      await manager.increment(
        Store,
        { id: entity.storeId },
        'totalRevenue',
        Number(entity.totalAmount)
      );
    }

    // Order refunded/cancelled (was completed, now not)
    if (
      oldStatus === OrderStatus.SHIPPED &&
      newStatus !== OrderStatus.SHIPPED
    ) {
      await manager.decrement(Store, { id: entity.storeId }, 'orderCount', 1);
      await manager.decrement(
        Store,
        { id: entity.storeId },
        'totalRevenue',
        Number(entity.totalAmount)
      );
    }
  }
}
