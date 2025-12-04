import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IReviewsRepository } from 'common/contracts/analytics.contract';
import { Review } from 'entities/read-only/review.entity';

export type RatingDistribution = {
  [key: number]: number;
};

export type AggregateRating = {
  totalReviews: number;
  averageRating: number;
  distribution: RatingDistribution;
};

@Injectable()
export class AnalyticsReviewsRepository implements IReviewsRepository {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>
  ) {}

  async getReviewsSummary(storeId: string, from?: string, to?: string) {
    // Build query for reviews in this store
    const qb = this.reviewsRepository
      .createQueryBuilder('review')
      .leftJoin('review.product', 'product')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.deletedAt IS NULL');

    // Apply date filters if provided
    if (from) {
      qb.andWhere('review.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('review.createdAt <= :to', { to });
    }

    // Get aggregate statistics
    return qb
      .select('COUNT(*)', 'totalReviews')
      .addSelect('ROUND(AVG(review.rating)::NUMERIC, 2)', 'averageRating')
      .addSelect(
        'COUNT(CASE WHEN review.rating >= 4 THEN 1 END)',
        'positiveReviews'
      )
      .addSelect(
        'COUNT(CASE WHEN review.rating <= 2 THEN 1 END)',
        'negativeReviews'
      )
      .addSelect(
        'COUNT(CASE WHEN review.rating = 5 THEN 1 END)',
        'fiveStarReviews'
      )
      .addSelect(
        'COUNT(CASE WHEN review.rating = 4 THEN 1 END)',
        'fourStarReviews'
      )
      .addSelect(
        'COUNT(CASE WHEN review.rating = 3 THEN 1 END)',
        'threeStarReviews'
      )
      .addSelect(
        'COUNT(CASE WHEN review.rating = 2 THEN 1 END)',
        'twoStarReviews'
      )
      .addSelect(
        'COUNT(CASE WHEN review.rating = 1 THEN 1 END)',
        'oneStarReviews'
      )
      .getRawOne();
  }
  async getTopReviewedProducts(storeId: string) {
    return this.reviewsRepository
      .createQueryBuilder('review')
      .leftJoin('review.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('COUNT(*)', 'reviewCount')
      .addSelect('ROUND(AVG(review.rating)::NUMERIC, 2)', 'avgRating')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.deletedAt IS NULL')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('"reviewCount"', 'DESC')
      .limit(5)
      .getRawMany();
  }

  async getRatingAggregate(productId: string): Promise<AggregateRating> {
    const aggregateQb = this.reviewsRepository
      .createQueryBuilder('r')
      .select(['COUNT(r.id) as count', 'AVG(r.rating) as avg'])
      .where('r.productId = :productId', { productId });

    const raw = await aggregateQb.getRawOne();

    const distributionQb = this.reviewsRepository
      .createQueryBuilder('r')
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
