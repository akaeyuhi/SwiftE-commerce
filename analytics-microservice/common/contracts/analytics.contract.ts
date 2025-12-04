import { AggregateRating } from 'src/analytics-reviews/reviews-data.repository';

export const IReviewsRepository = Symbol('REVIEWS_MINIMAL_REPOSITORY');

export interface IReviewsRepository {
  getRatingAggregate(productId: string): Promise<AggregateRating>;
  getReviewsSummary(
    storeId: string,
    from?: string,
    to?: string
  ): Promise<{
    positiveReviews: string;
    negativeReviews: string;
    fiveStarReviews: string;
    fourStarReviews: string;
    threeStarReviews: string;
    twoStarReviews: string;
    oneStarReviews: string;
    totalReviews: string;
    averageRating: string;
  }>;
  getTopReviewedProducts(storeId: string): Promise<
    Array<{
      productName: string;
      productId: string;
      reviewCount: string;
      averageRating: string;
    }>
  >;
}
