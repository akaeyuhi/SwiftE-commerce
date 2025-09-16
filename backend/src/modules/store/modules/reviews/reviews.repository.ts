import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Review } from 'src/entities/review.entity';

@Injectable()
export class ReviewsRepository extends BaseRepository<Review> {
  constructor(dataSource: DataSource) {
    super(Review, dataSource.createEntityManager());
  }

  async getRatingAggregate(productId: string) {
    const qb = this.createQueryBuilder('r')
      .select(['COUNT(r.id) as count', 'AVG(r.rating) as avg'])
      .where('r.product = :productId', { productId });

    const raw = await qb.getRawOne();
    return {
      count: Number(raw?.count ?? 0),
      avg: raw?.avg !== null ? Number(raw.avg) : null,
    };
  }
}
