import { Test, TestingModule } from '@nestjs/testing';
import { ProductRankingRepository } from 'src/modules/products/repositories/product-ranking.repository';
import { createRepositoryMock, MockedMethods } from 'test/unit/helpers';
import { ProductsRankingService } from 'src/modules/products/services/product-ranking.service';
/* eslint-disable camelcase*/

describe('ProductsRankingService', () => {
  let service: ProductsRankingService;
  let repo: Partial<MockedMethods<ProductRankingRepository>>;

  beforeEach(async () => {
    repo = createRepositoryMock<ProductRankingRepository>([
      'findTopProductsByViews',
      'findTopProductsBySales',
      'findTopRatedProducts',
      'findTopProductsByConversion',
      'findTrendingProducts',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsRankingService,
        { provide: ProductRankingRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<ProductsRankingService>(ProductsRankingService);
    jest.clearAllMocks();
  });

  describe('getTopProductsByViews', () => {
    it('should return top products by view count', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_description: 'Desc 1',
          p_viewCount: 1000,
          p_averageRating: '4.5',
          mainPhotoUrl: 'photo.jpg',
        },
      ];

      repo.findTopProductsByViews!.mockResolvedValue(rawProducts as any);

      const result = await service.getTopProductsByViews('s1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(result[0].viewCount).toBe(1000);
      expect(repo.findTopProductsByViews).toHaveBeenCalledWith('s1', 10);
    });

    it('should use default limit', async () => {
      repo.findTopProductsByViews!.mockResolvedValue([]);

      await service.getTopProductsByViews('s1');

      expect(repo.findTopProductsByViews).toHaveBeenCalledWith('s1', 10);
    });
  });

  describe('getTopProductsBySales', () => {
    it('should return top products by sales', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_totalSales: 500,
          mainPhotoUrl: 'photo.jpg',
        },
      ];

      repo.findTopProductsBySales!.mockResolvedValue(rawProducts as any);

      const result = await service.getTopProductsBySales('s1', 15);

      expect(result[0].totalSales).toBe(500);
      expect(repo.findTopProductsBySales).toHaveBeenCalledWith('s1', 15);
    });
  });

  describe('getTopRatedProducts', () => {
    it('should return top rated products', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_averageRating: '4.8',
          p_reviewCount: 100,
        },
      ];

      repo.findTopRatedProducts!.mockResolvedValue(rawProducts as any);

      const result = await service.getTopRatedProducts('s1', 10, 5);

      expect(result[0].averageRating).toBe(4.8);
      expect(repo.findTopRatedProducts).toHaveBeenCalledWith('s1', 10, 5);
    });
  });

  describe('getTrendingProducts', () => {
    it('should calculate trending scores and return sorted products', async () => {
      const now = new Date();
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          recentViews: '100',
          recentLikes: '10',
          recentSales: '5',
        },
        {
          p_id: 'p2',
          p_name: 'Product 2',
          p_createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          recentViews: '50',
          recentLikes: '5',
          recentSales: '10',
        },
      ];

      repo.findTrendingProducts!.mockResolvedValue(rawProducts as any);

      const result = await service.getTrendingProducts('s1', 10, 7);

      expect(result).toHaveLength(2);
      expect(repo.findTrendingProducts).toHaveBeenCalled();
    });

    it('should filter out products with zero trending score (old product)', async () => {
      // Create an old product that has no recency boost
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old, so recencyBoost = 0

      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Old Product',
          p_createdAt: oldDate, // Old product
          recentViews: '0',
          recentLikes: '0',
          recentSales: '0',
        },
      ];

      repo.findTrendingProducts!.mockResolvedValue(rawProducts as any);

      const result = await service.getTrendingProducts('s1');

      expect(result).toEqual([]);
    });

    it('should include new products with zero activity due to recency boost', async () => {
      const newDate = new Date(); // Today

      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'New Product',
          p_createdAt: newDate, // New product
          recentViews: '0',
          recentLikes: '0',
          recentSales: '0',
        },
      ];

      repo.findTrendingProducts!.mockResolvedValue(rawProducts as any);

      const result = await service.getTrendingProducts('s1');

      // Should NOT be empty because of recency boost
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });
  });
});
