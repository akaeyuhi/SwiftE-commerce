import { IReviewsRepository } from 'src/common/contracts/reviews.contract';
import { Injectable } from '@nestjs/common';
import {
  AggregateRating,
  ReviewsRepository,
} from 'src/modules/products/reviews/reviews.repository';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AiReviewsRepository implements IReviewsRepository {
  constructor(
    @InjectRepository(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository
  ) {}
  async getRatingAggregate(productId: string): Promise<AggregateRating> {
    const qb = this.reviewsRepository
      .createQueryBuilder('r')
      .select(['COUNT(r.id) as count', 'AVG(r.rating) as avg'])
      .where('r.product = :productId', { productId });

    const raw = await qb.getRawOne();
    return {
      count: Number(raw?.count ?? 0),
      avg: raw?.avg !== null ? Number(raw.avg) : null,
    };
  }
}
