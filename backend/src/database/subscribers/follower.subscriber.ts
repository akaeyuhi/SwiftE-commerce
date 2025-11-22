import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import { Like } from 'src/entities/user/like.entity';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { StoreFollower } from 'src/entities/store/store-follower.entity';

@EventSubscriber()
@Injectable()
export class FollowerSubscriber implements EntitySubscriberInterface<Like> {
  constructor(@InjectDataSource() private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Like;
  }

  async afterInsert(event: InsertEvent<Like>): Promise<void> {
    const { entity } = event;

    if (entity.storeId || entity.store?.id) {
      await this.insertFollower(entity);
    }
  }

  async beforeRemove(event: RemoveEvent<Like>): Promise<void> {
    const { entity } = event;

    if (entity?.store?.id || entity?.storeId) {
      await this.removeFollower(entity);
    }
  }

  private async insertFollower(entity: Like) {
    const repo = this.dataSource.getRepository(StoreFollower);
    const storeFollower = await repo.findOne({
      where: {
        user: { id: entity.userId },
        store: { id: entity.storeId ?? entity.store?.id },
      },
    });
    if (storeFollower) return null;
    const result = repo.create({
      userId: entity.userId,
      storeId: entity.store?.id ?? entity.storeId,
      emailNotifications: true,
    });
    return repo.save(result);
  }

  private async removeFollower(entity: Like) {
    const repo = this.dataSource.getRepository(StoreFollower);
    const storeFollower = await repo.findOne({
      where: {
        userId: entity.userId,
        storeId: entity.storeId ?? entity.store?.id,
      },
    });
    if (!storeFollower) return null;
    return repo.remove(storeFollower);
  }
}
