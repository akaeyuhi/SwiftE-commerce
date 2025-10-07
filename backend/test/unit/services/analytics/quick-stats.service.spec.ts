import { Test, TestingModule } from '@nestjs/testing';
import { QuickStatsService } from 'src/modules/analytics/services/quick-stats.service';
import { Repository } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';

describe('QuickStatsService', () => {
  let service: QuickStatsService;
  let productRepo: Partial<MockedMethods<Repository<Product>>>;
  let storeRepo: Partial<MockedMethods<Repository<Store>>>;

  beforeEach(async () => {
    productRepo = createMock<Repository<Product>>(['findOne', 'find']);
    storeRepo = createMock<Repository<Store>>(['findOne']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickStatsService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Store), useValue: storeRepo },
      ],
    }).compile();

    service = module.get<QuickStatsService>(QuickStatsService);
    jest.clearAllMocks();
  });

  describe('getProductQuickStats', () => {
    it('should return product quick stats', async () => {
      const product = {
        id: 'p1',
        name: 'Test Product',
        viewCount: 100,
        likeCount: 10,
        totalSales: 20,
        reviewCount: 5,
        averageRating: 4.5,
      };

      productRepo.findOne!.mockResolvedValue(product as any);

      const result = await service.getProductQuickStats('p1');

      expect(result).toEqual({
        productId: 'p1',
        name: 'Test Product',
        viewCount: 100,
        likeCount: 10,
        totalSales: 20,
        reviewCount: 5,
        averageRating: 4.5,
        conversionRate: 20, // (20/100) * 100
        source: 'cached',
      });
    });

    it('should calculate conversion rate correctly', async () => {
      const product = {
        id: 'p1',
        name: 'Product',
        viewCount: 200,
        totalSales: 10,
        likeCount: 0,
        reviewCount: 0,
        averageRating: 0,
      };

      productRepo.findOne!.mockResolvedValue(product as any);

      const result = await service.getProductQuickStats('p1');

      expect(result.conversionRate).toBe(5); // (10/200) * 100
    });

    it('should handle zero views', async () => {
      const product = {
        id: 'p1',
        name: 'Product',
        viewCount: 0,
        totalSales: 0,
        likeCount: 0,
        reviewCount: 0,
        averageRating: 0,
      };

      productRepo.findOne!.mockResolvedValue(product as any);

      const result = await service.getProductQuickStats('p1');

      expect(result.conversionRate).toBe(0);
    });

    it('should handle null values', async () => {
      const product = {
        id: 'p1',
        name: 'Product',
        viewCount: null,
        likeCount: null,
        totalSales: null,
        reviewCount: null,
        averageRating: null,
      };

      productRepo.findOne!.mockResolvedValue(product as any);

      const result = await service.getProductQuickStats('p1');

      expect(result.viewCount).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.totalSales).toBe(0);
      expect(result.reviewCount).toBe(0);
      expect(result.averageRating).toBe(0);
    });

    it('should throw error when product not found', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      await expect(service.getProductQuickStats('nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should round conversion rate to 2 decimals', async () => {
      const product = {
        id: 'p1',
        name: 'Product',
        viewCount: 300,
        totalSales: 7,
        likeCount: 0,
        reviewCount: 0,
        averageRating: 0,
      };

      productRepo.findOne!.mockResolvedValue(product as any);

      const result = await service.getProductQuickStats('p1');

      expect(result.conversionRate).toBe(2.33); // (7/300) * 100 = 2.333...
    });
  });

  describe('getStoreQuickStats', () => {
    it('should return store quick stats', async () => {
      const store = {
        id: 's1',
        name: 'Test Store',
        productCount: 50,
        followerCount: 200,
        orderCount: 100,
        totalRevenue: 10000,
      };

      storeRepo.findOne!.mockResolvedValue(store as any);

      const result = await service.getStoreQuickStats('s1');

      expect(result).toEqual({
        storeId: 's1',
        name: 'Test Store',
        productCount: 50,
        followerCount: 200,
        orderCount: 100,
        totalRevenue: 10000,
        averageOrderValue: 100, // 10000/100
        source: 'cached',
      });
    });

    it('should calculate average order value correctly', async () => {
      const store = {
        id: 's1',
        name: 'Store',
        productCount: 10,
        followerCount: 50,
        orderCount: 25,
        totalRevenue: 2500.75,
      };

      storeRepo.findOne!.mockResolvedValue(store as any);

      const result = await service.getStoreQuickStats('s1');

      expect(result.averageOrderValue).toBe(100.03); // 2500.75/25
    });

    it('should handle zero orders', async () => {
      const store = {
        id: 's1',
        name: 'Store',
        productCount: 5,
        followerCount: 10,
        orderCount: 0,
        totalRevenue: 0,
      };

      storeRepo.findOne!.mockResolvedValue(store as any);

      const result = await service.getStoreQuickStats('s1');

      expect(result.averageOrderValue).toBe(0);
    });

    it('should handle null values', async () => {
      const store = {
        id: 's1',
        name: 'Store',
        productCount: null,
        followerCount: null,
        orderCount: null,
        totalRevenue: null,
      };

      storeRepo.findOne!.mockResolvedValue(store as any);

      const result = await service.getStoreQuickStats('s1');

      expect(result.productCount).toBe(0);
      expect(result.followerCount).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });

    it('should throw error when store not found', async () => {
      storeRepo.findOne!.mockResolvedValue(null);

      await expect(service.getStoreQuickStats('nonexistent')).rejects.toThrow(
        'Store not found'
      );
    });
  });

  describe('getBatchProductStats', () => {
    it('should return stats for multiple products', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product 1',
          viewCount: 100,
          likeCount: 10,
          totalSales: 20,
          reviewCount: 5,
          averageRating: 4.5,
        },
        {
          id: 'p2',
          name: 'Product 2',
          viewCount: 200,
          likeCount: 20,
          totalSales: 30,
          reviewCount: 10,
          averageRating: 4.0,
        },
      ];

      productRepo.find!.mockResolvedValue(products as any);

      const result = await service.getBatchProductStats(['p1', 'p2']);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p1');
      expect(result[0].conversionRate).toBe(20);
      expect(result[1].productId).toBe('p2');
      expect(result[1].conversionRate).toBe(15);
    });

    it('should handle empty array', async () => {
      productRepo.find!.mockResolvedValue([]);

      const result = await service.getBatchProductStats([]);

      expect(result).toEqual([]);
    });

    it('should handle products with zero views', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product',
          viewCount: 0,
          totalSales: 0,
          likeCount: 0,
          reviewCount: 0,
          averageRating: 0,
        },
      ];

      productRepo.find!.mockResolvedValue(products as any);

      const result = await service.getBatchProductStats(['p1']);

      expect(result[0].conversionRate).toBe(0);
    });

    it('should handle missing products', async () => {
      productRepo.find!.mockResolvedValue([]);

      const result = await service.getBatchProductStats(['p1', 'p2', 'p3']);

      expect(result).toEqual([]);
    });
  });
});
