import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Like } from 'src/entities/user/like.entity';

@Injectable()
export class LikesRepository extends BaseRepository<Like> {
  constructor(dataSource: DataSource) {
    super(Like, dataSource.createEntityManager());
  }

  async findByUserAndProduct(userId: string, productId: string) {
    return this.findOne({
      where: { user: { id: userId }, product: { id: productId } } as any,
    });
  }

  async findByUserAndStore(userId: string, storeId: string) {
    return this.findOne({
      where: { user: { id: userId }, store: { id: storeId } } as any,
    });
  }

  async listByUser(userId: string) {
    return this.find({
      where: { user: { id: userId } } as any,
      relations: ['product', 'store'],
      order: { createdAt: 'DESC' },
    });
  }
}
