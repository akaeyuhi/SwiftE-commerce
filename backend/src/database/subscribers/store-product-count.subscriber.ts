/* eslint-disable prettier/prettier */
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

@EventSubscriber()
@Injectable()
export class StoreProductCountSubscriber
  implements EntitySubscriberInterface<Product> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Product;
  }

  async afterInsert(event: InsertEvent<Product>): Promise<void> {
    if (event.entity.storeId) {
      await event.manager.increment(
        Store,
        { id: event.entity.storeId },
        'productCount',
        1
      );
    }
  }

  async afterRemove(event: RemoveEvent<Product>): Promise<void> {
    if (event.entity?.storeId) {
      await event.manager.decrement(
        Store,
        { id: event.entity.storeId },
        'productCount',
        1
      );
    }
  }

  async afterUpdate(event: UpdateEvent<Product>): Promise<void> {
    // Handle soft delete
    const entity = event.entity as Product;
    const databaseEntity = event.databaseEntity;

    if (!entity || !databaseEntity) return;

    // Soft deleted (deletedAt changed from null to date)
    if (!databaseEntity.deletedAt && entity.deletedAt) {
      await event.manager.decrement(
        Store,
        { id: entity.storeId },
        'productCount',
        1
      );
    }

    // Restored from soft delete (deletedAt changed from date to null)
    if (databaseEntity.deletedAt && !entity.deletedAt) {
      await event.manager.increment(
        Store,
        { id: entity.storeId },
        'productCount',
        1
      );
    }
  }
}
