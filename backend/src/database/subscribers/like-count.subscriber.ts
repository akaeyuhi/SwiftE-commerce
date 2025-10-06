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

@EventSubscriber()
@Injectable()
export class LikeCountSubscriber implements EntitySubscriberInterface<Like> {
  constructor(private dataSource: DataSource) {
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return Like;
  }

  async afterInsert(event: InsertEvent<Like>): Promise<void> {
    const { manager, entity } = event;

    if (entity.product?.id) {
      await manager.increment(
        Product,
        { id: entity.product.id },
        'likeCount',
        1
      );
    }

    if (entity.store?.id) {
      await manager.increment(
        Store,
        { id: entity.store.id },
        'followerCount',
        1
      );
    }
  }

  async afterRemove(event: RemoveEvent<Like>): Promise<void> {
    const { manager, entity } = event;

    if (entity?.product?.id) {
      await manager.decrement(
        Product,
        { id: entity.product.id },
        'likeCount',
        1
      );
    }

    if (entity?.store?.id) {
      await manager.decrement(
        Store,
        { id: entity.store.id },
        'followerCount',
        1
      );
    }
  }
}
