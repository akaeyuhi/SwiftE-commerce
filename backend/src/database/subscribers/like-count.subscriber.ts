import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { Like } from 'src/entities/user/like.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

@EventSubscriber()
@Injectable()
export class LikeCountSubscriber implements EntitySubscriberInterface<Like> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Like;
  }

  async afterInsert(event: InsertEvent<Like>): Promise<void> {
    const { manager, entity } = event;

    if (entity.productId || entity.product?.id) {
      await manager.increment(
        Product,
        { id: entity.productId ?? entity.product?.id },
        'likeCount',
        1
      );
    }

    if (entity.storeId || entity.store?.id) {
      await manager.increment(
        Store,
        { id: entity.storeId ?? entity.store?.id },
        'followerCount',
        1
      );
    }
  }

  async beforeRemove(event: RemoveEvent<Like>): Promise<void> {
    const { manager, entity } = event;

    if (entity?.product?.id || entity?.productId) {
      await manager.decrement(
        Product,
        { id: entity.productId ?? entity.product?.id },
        'likeCount',
        1
      );
    }

    if (entity?.store?.id || entity?.storeId) {
      await manager.decrement(
        Store,
        { id: entity.storeId ?? entity.store?.id },
        'followerCount',
        1
      );
    }
  }
}
