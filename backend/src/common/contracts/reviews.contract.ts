import { AggregateRating } from 'src/modules/products/reviews/reviews.repository';

export const REVIEWS_REPOSITORY = 'REVIEWS_REPOSITORY';

export interface IReviewsRepository {
  getRatingAggregate(productId: string): Promise<AggregateRating>;
}
