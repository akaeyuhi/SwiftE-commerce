import { AggregateRating } from 'src/modules/products/reviews/reviews.repository';

export const IReviewsRepository = Symbol('REVIEWS_MINIMAL_REPOSITORY');

export interface IReviewsRepository {
  getRatingAggregate(productId: string): Promise<AggregateRating>;
}
