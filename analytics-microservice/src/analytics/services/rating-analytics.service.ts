import { Inject, Injectable } from '@nestjs/common';
import { IReviewsRepository } from 'common/contracts/analytics.contract';

@Injectable()
export class RatingAnalyticsService {
  constructor(
    @Inject(IReviewsRepository)
    private readonly reviewsRepo: IReviewsRepository
  ) {}

  async recomputeProductRating(productId: string) {
    return this.reviewsRepo.getRatingAggregate(productId);
  }

  async getStoreRatingsSummary(storeId: string, from?: string, to?: string) {
    const stats = await this.reviewsRepo.getReviewsSummary(storeId, from, to);

    const totalReviews = parseInt(stats.totalReviews) || 0;
    const positiveReviews = parseInt(stats.positiveReviews) || 0;
    const negativeReviews = parseInt(stats.negativeReviews) || 0;

    const distribution =
      totalReviews > 0
        ? {
            fiveStar: Math.round(
              (parseInt(stats.fiveStarReviews) / totalReviews) * 100
            ),
            fourStar: Math.round(
              (parseInt(stats.fourStarReviews) / totalReviews) * 100
            ),
            threeStar: Math.round(
              (parseInt(stats.threeStarReviews) / totalReviews) * 100
            ),
            twoStar: Math.round(
              (parseInt(stats.twoStarReviews) / totalReviews) * 100
            ),
            oneStar: Math.round(
              (parseInt(stats.oneStarReviews) / totalReviews) * 100
            ),
          }
        : {
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0,
          };

    const topReviewedProducts =
      await this.reviewsRepo.getTopReviewedProducts(storeId);

    return {
      storeId,
      dateRange: { from, to },
      summary: {
        totalReviews,
        averageRating: parseFloat(stats.averageRating) || 0,
        positiveReviews,
        negativeReviews,
        positiveRate:
          totalReviews > 0
            ? Math.round((positiveReviews / totalReviews) * 100)
            : 0,
        negativeRate:
          totalReviews > 0
            ? Math.round((negativeReviews / totalReviews) * 100)
            : 0,
      },
      distribution,
      topReviewedProducts: topReviewedProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        reviewCount: parseInt(p.reviewCount),
        averageRating: parseFloat(p.averageRating) || 0,
      })),
    };
  }
}
