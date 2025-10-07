import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Review } from 'src/entities/store/review.entity';

export type RatingDistribution = {
  [key: number]: number;
};

export type AggregateRating = {
  totalReviews: number;
  averageRating: number;
  distribution: RatingDistribution;
};

@Injectable()
export class ReviewsRepository extends BaseRepository<Review> {
  constructor(dataSource: DataSource) {
    super(Review, dataSource.createEntityManager());
  }

  async getRatingAggregate(productId: string): Promise<AggregateRating> {
    const aggregateQb = this.createQueryBuilder('r')
      .select(['COUNT(r.id) as count', 'AVG(r.rating) as avg'])
      .where('r.productId = :productId', { productId });

    const raw = await aggregateQb.getRawOne();

    const distributionQb = this.createQueryBuilder('r')
      .select(['r.rating', 'COUNT(r.id) as count'])
      .where('r.productId = :productId', { productId })
      .groupBy('r.rating')
      .orderBy('r.rating', 'ASC');

    const distributionRaw = await distributionQb.getRawMany();

    const distribution: RatingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = 0;
    }

    distributionRaw.forEach((row) => {
      const rating = Number(row.r_rating);
      const count = Number(row.count);
      if (rating >= 1 && rating <= 5) {
        distribution[rating] = count;
      }
    });

    return {
      totalReviews: Number(raw?.count ?? 0),
      averageRating: raw?.avg ? Number(raw.avg) : 0,
      distribution,
    };
  }
}
