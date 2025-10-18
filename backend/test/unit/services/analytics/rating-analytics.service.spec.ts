import { Test, TestingModule } from '@nestjs/testing';
import { RatingAnalyticsService } from 'src/modules/analytics/services/rating-analytics.service';
import { IReviewsRepository } from 'src/common/contracts/reviews.contract';

describe('RatingAnalyticsService', () => {
  let service: RatingAnalyticsService;
  let reviewsRepo: any;

  beforeEach(async () => {
    reviewsRepo = {
      getRatingAggregate: jest.fn(),
      getReviewsSummary: jest.fn(),
      getTopReviewedProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingAnalyticsService,
        { provide: IReviewsRepository, useValue: reviewsRepo },
      ],
    }).compile();

    service = module.get<RatingAnalyticsService>(RatingAnalyticsService);
    jest.clearAllMocks();
  });

  describe('recomputeProductRating', () => {
    it('should get rating aggregate from reviews repository', async () => {
      const rating = {
        averageRating: 4.5,
        totalReviews: 100,
        distribution: { 5: 60, 4: 30, 3: 5, 2: 3, 1: 2 },
      };

      reviewsRepo.getRatingAggregate.mockResolvedValue(rating);

      const result = await service.recomputeProductRating('p1');

      expect(result).toEqual(rating);
      expect(reviewsRepo.getRatingAggregate).toHaveBeenCalledWith('p1');
    });

    it('should handle products with no reviews', async () => {
      reviewsRepo.getRatingAggregate.mockResolvedValue({
        averageRating: 0,
        totalReviews: 0,
        distribution: {},
      });

      const result = await service.recomputeProductRating('p1');

      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
    });
  });

  describe('getStoreRatingsSummary', () => {
    it('should return comprehensive ratings summary', async () => {
      const summary = {
        totalReviews: '100',
        averageRating: '4.5',
        positiveReviews: '80',
        negativeReviews: '10',
        fiveStarReviews: '60',
        fourStarReviews: '20',
        threeStarReviews: '10',
        twoStarReviews: '5',
        oneStarReviews: '5',
      };

      const topProducts = [
        {
          productId: 'p1',
          productName: 'Product 1',
          reviewCount: '50',
          averageRating: '4.8',
        },
        {
          productId: 'p2',
          productName: 'Product 2',
          reviewCount: '30',
          averageRating: '4.2',
        },
      ];

      reviewsRepo.getReviewsSummary.mockResolvedValue(summary);
      reviewsRepo.getTopReviewedProducts.mockResolvedValue(topProducts);

      const result = await service.getStoreRatingsSummary(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.storeId).toBe('s1');
      expect(result.dateRange).toEqual({
        from: '2025-01-01',
        to: '2025-01-31',
      });
      expect(result.summary).toMatchObject({
        totalReviews: 100,
        averageRating: 4.5,
        positiveReviews: 80,
        negativeReviews: 10,
        positiveRate: 80, // 80/100 * 100
        negativeRate: 10, // 10/100 * 100
      });
    });

    it('should calculate rating distribution percentages', async () => {
      const summary = {
        totalReviews: '100',
        averageRating: '4.0',
        positiveReviews: '70',
        negativeReviews: '20',
        fiveStarReviews: '40',
        fourStarReviews: '30',
        threeStarReviews: '10',
        twoStarReviews: '10',
        oneStarReviews: '10',
      };

      reviewsRepo.getReviewsSummary.mockResolvedValue(summary);
      reviewsRepo.getTopReviewedProducts.mockResolvedValue([]);

      const result = await service.getStoreRatingsSummary('s1');

      expect(result.distribution).toEqual({
        fiveStar: 40, // 40/100 * 100
        fourStar: 30,
        threeStar: 10,
        twoStar: 10,
        oneStar: 10,
      });
    });

    it('should handle stores with no reviews', async () => {
      const summary = {
        totalReviews: '0',
        averageRating: '0',
        positiveReviews: '0',
        negativeReviews: '0',
        fiveStarReviews: '0',
        fourStarReviews: '0',
        threeStarReviews: '0',
        twoStarReviews: '0',
        oneStarReviews: '0',
      };

      reviewsRepo.getReviewsSummary.mockResolvedValue(summary);
      reviewsRepo.getTopReviewedProducts.mockResolvedValue([]);

      const result = await service.getStoreRatingsSummary('s1');

      expect(result.summary.totalReviews).toBe(0);
      expect(result.summary.positiveRate).toBe(0);
      expect(result.distribution.fiveStar).toBe(0);
    });

    it('should format top reviewed products correctly', async () => {
      const summary = {
        totalReviews: '50',
        averageRating: '4.0',
        positiveReviews: '40',
        negativeReviews: '5',
        fiveStarReviews: '20',
        fourStarReviews: '20',
        threeStarReviews: '5',
        twoStarReviews: '3',
        oneStarReviews: '2',
      };

      const topProducts = [
        {
          productId: 'p1',
          productName: 'Product 1',
          reviewCount: '25',
          averageRating: '4.5',
        },
        {
          productId: 'p2',
          productName: 'Product 2',
          reviewCount: '15',
          averageRating: '3.8',
        },
      ];

      reviewsRepo.getReviewsSummary.mockResolvedValue(summary);
      reviewsRepo.getTopReviewedProducts.mockResolvedValue(topProducts);

      const result = await service.getStoreRatingsSummary('s1');

      expect(result.topReviewedProducts).toEqual([
        {
          productId: 'p1',
          productName: 'Product 1',
          reviewCount: 25,
          averageRating: 4.5,
        },
        {
          productId: 'p2',
          productName: 'Product 2',
          reviewCount: 15,
          averageRating: 3.8,
        },
      ]);
    });

    it('should handle null average ratings in top products', async () => {
      const summary = {
        totalReviews: '10',
        averageRating: '3.0',
        positiveReviews: '5',
        negativeReviews: '3',
        fiveStarReviews: '2',
        fourStarReviews: '3',
        threeStarReviews: '2',
        twoStarReviews: '2',
        oneStarReviews: '1',
      };

      const topProducts = [
        {
          productId: 'p1',
          productName: 'Product',
          reviewCount: '10',
          averageRating: null,
        },
      ];

      reviewsRepo.getReviewsSummary.mockResolvedValue(summary);
      reviewsRepo.getTopReviewedProducts.mockResolvedValue(topProducts);

      const result = await service.getStoreRatingsSummary('s1');

      expect(result.topReviewedProducts[0].averageRating).toBe(0);
    });

    it('should pass date range to repository', async () => {
      const summary = {
        totalReviews: '0',
        averageRating: '0',
        positiveReviews: '0',
        negativeReviews: '0',
        fiveStarReviews: '0',
        fourStarReviews: '0',
        threeStarReviews: '0',
        twoStarReviews: '0',
        oneStarReviews: '0',
      };

      reviewsRepo.getReviewsSummary.mockResolvedValue(summary);
      reviewsRepo.getTopReviewedProducts.mockResolvedValue([]);

      await service.getStoreRatingsSummary('s1', '2025-01-01', '2025-01-31');

      expect(reviewsRepo.getReviewsSummary).toHaveBeenCalledWith(
        's1',
        '2025-01-01',
        '2025-01-31'
      );
    });
  });
});
