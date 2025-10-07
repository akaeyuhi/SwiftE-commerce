import { Test, TestingModule } from '@nestjs/testing';
import { ConversionAnalyticsService } from 'src/modules/analytics/services/conversion-analytics.service';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { QuickStatsService } from 'src/modules/analytics/services/quick-stats.service';
import { Repository } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('ConversionAnalyticsService', () => {
  let service: ConversionAnalyticsService;
  let eventsRepo: Partial<MockedMethods<AnalyticsEventRepository>>;
  let storeStatsRepo: Partial<MockedMethods<StoreDailyStatsRepository>>;
  let productStatsRepo: Partial<MockedMethods<ProductDailyStatsRepository>>;
  let productRepo: Partial<MockedMethods<Repository<Product>>>;
  let storeRepo: Partial<MockedMethods<Repository<Store>>>;
  let quickStats: Partial<MockedMethods<QuickStatsService>>;

  beforeEach(async () => {
    eventsRepo = createMock<AnalyticsEventRepository>([
      'aggregateProductMetrics',
      'aggregateStoreMetrics',
      'getTopProductsByConversion',
    ]);
    storeStatsRepo = createMock<StoreDailyStatsRepository>([
      'getAggregatedMetrics',
      'find',
    ]);
    productStatsRepo = createMock<ProductDailyStatsRepository>([
      'getAggregateRange',
      'getAggregatedMetrics',
      'find',
    ]);
    productRepo = createMock<Repository<Product>>([
      'createQueryBuilder',
      'find',
    ]);
    storeRepo = createMock<Repository<Store>>(['find']);
    quickStats = createMock<QuickStatsService>([
      'getProductQuickStats',
      'getStoreQuickStats',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversionAnalyticsService,
        { provide: AnalyticsEventRepository, useValue: eventsRepo },
        { provide: StoreDailyStatsRepository, useValue: storeStatsRepo },
        { provide: ProductDailyStatsRepository, useValue: productStatsRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Store), useValue: storeRepo },
        { provide: QuickStatsService, useValue: quickStats },
      ],
    }).compile();

    service = module.get<ConversionAnalyticsService>(
      ConversionAnalyticsService
    );
    jest.clearAllMocks();
  });

  describe('computeProductConversion', () => {
    describe('without date range (cached)', () => {
      it('should use hybrid cached stats', async () => {
        const productQuickStats = {
          productId: 'p1',
          name: 'Product',
          viewCount: 100,
          totalSales: 20,
          conversionRate: 20,
        };

        const addToCartData = {
          views: 100,
          purchases: 20,
          addToCarts: 50,
          revenue: 2000,
        };

        quickStats.getProductQuickStats!.mockResolvedValue(
          productQuickStats as any
        );
        eventsRepo.aggregateProductMetrics!.mockResolvedValue(
          addToCartData as any
        );

        const result = await service.computeProductConversion('p1');

        expect(result).toEqual({
          productId: 'p1',
          views: 100,
          purchases: 20,
          addToCarts: 50,
          revenue: 0,
          conversionRate: 0.2, // 20 / 100
          addToCartRate: 0.5, // 50 / 100
          source: 'hybridCached',
        });
        expect(quickStats.getProductQuickStats).toHaveBeenCalledWith('p1');
      });

      it('should handle zero views', async () => {
        const productQuickStats = {
          productId: 'p1',
          name: 'Product',
          viewCount: 0,
          totalSales: 0,
          conversionRate: 0,
        };

        quickStats.getProductQuickStats!.mockResolvedValue(
          productQuickStats as any
        );
        eventsRepo.aggregateProductMetrics!.mockResolvedValue({
          views: 0,
          purchases: 0,
          addToCarts: 0,
          revenue: 0,
        } as any);

        const result = await service.computeProductConversion('p1');

        expect(result.conversionRate).toBe(0);
        expect(result.addToCartRate).toBe(0);
      });
    });

    describe('with date range (aggregated)', () => {
      it('should use aggregated stats when available', async () => {
        const agg = {
          views: 200,
          purchases: 30,
          addToCarts: 80,
          revenue: 3000,
        };

        productStatsRepo.getAggregateRange!.mockResolvedValue(agg as any);

        const result = await service.computeProductConversion(
          'p1',
          '2025-01-01',
          '2025-01-31'
        );

        expect(result).toEqual({
          productId: 'p1',
          views: 200,
          purchases: 30,
          addToCarts: 80,
          revenue: 3000,
          conversionRate: 0.15, // 30/200
          addToCartRate: 0.4, // 80/200
          source: 'aggregatedStats',
        });
      });

      it('should fallback to raw events when no aggregated data', async () => {
        productStatsRepo.getAggregateRange!.mockResolvedValue({
          views: 0,
          purchases: 0,
          addToCarts: 0,
          revenue: 0,
        } as any);

        const rawData = {
          views: 150,
          purchases: 15,
          addToCarts: 45,
          revenue: 1500,
        };

        eventsRepo.aggregateProductMetrics!.mockResolvedValue(rawData as any);

        const result = await service.computeProductConversion(
          'p1',
          '2025-01-01',
          '2025-01-31'
        );

        expect(result.source).toBe('rawEvents');
        expect(result.views).toBe(150);
        expect(result.conversionRate).toBe(0.1);
      });

      it('should handle zero views in calculations', async () => {
        const rawData = {
          views: 0,
          purchases: 0,
          addToCarts: 0,
          revenue: 0,
        };

        productStatsRepo.getAggregateRange!.mockResolvedValue(rawData as any);
        eventsRepo.aggregateProductMetrics!.mockResolvedValue(rawData as any);

        const result = await service.computeProductConversion(
          'p1',
          '2025-01-01',
          '2025-01-31'
        );

        expect(result.conversionRate).toBe(0);
        expect(result.addToCartRate).toBe(0);
      });
    });
  });

  describe('computeStoreConversion', () => {
    describe('without date range (cached)', () => {
      it('should use hybrid cached stats', async () => {
        const storeQuickStats = {
          storeId: 's1',
          name: 'Store',
          orderCount: 100,
          totalRevenue: 10000,
        };

        const eventData = {
          views: 1000,
          purchases: 100,
          addToCarts: 300,
          checkouts: 150,
          revenue: 10000,
        };

        quickStats.getStoreQuickStats!.mockResolvedValue(
          storeQuickStats as any
        );
        eventsRepo.aggregateStoreMetrics!.mockResolvedValue(eventData as any);

        const result = await service.computeStoreConversion('s1');

        expect(result).toEqual({
          storeId: 's1',
          views: 1000,
          purchases: 100,
          addToCarts: 300,
          revenue: 10000,
          checkouts: 150,
          conversionRate: 0.1, // 100/1000
          addToCartRate: 0.3, // 300/1000
          checkoutRate: 0.5, // 150/300
          source: 'hybridCached',
        });
      });

      it('should handle zero views', async () => {
        quickStats.getStoreQuickStats!.mockResolvedValue({
          storeId: 's1',
          orderCount: 0,
          totalRevenue: 0,
        } as any);

        eventsRepo.aggregateStoreMetrics!.mockResolvedValue({
          views: 0,
          purchases: 0,
          addToCarts: 0,
          checkouts: 0,
          revenue: 0,
        } as any);

        const result = await service.computeStoreConversion('s1');

        expect(result.conversionRate).toBe(0);
        expect(result.addToCartRate).toBe(0);
        expect(result.checkoutRate).toBe(0);
      });

      it('should handle zero addToCarts for checkout rate', async () => {
        quickStats.getStoreQuickStats!.mockResolvedValue({
          storeId: 's1',
          orderCount: 10,
          totalRevenue: 1000,
        } as any);

        eventsRepo.aggregateStoreMetrics!.mockResolvedValue({
          views: 100,
          purchases: 10,
          addToCarts: 0,
          checkouts: 5,
          revenue: 1000,
        } as any);

        const result = await service.computeStoreConversion('s1');

        expect(result.checkoutRate).toBe(0);
      });
    });

    describe('with date range (aggregated)', () => {
      it('should use aggregated stats when available', async () => {
        const agg = {
          views: 2000,
          purchases: 200,
          addToCarts: 600,
          revenue: 20000,
          checkouts: 300,
        };

        storeStatsRepo.getAggregatedMetrics!.mockResolvedValue(agg as any);

        const result = await service.computeStoreConversion(
          's1',
          '2025-01-01',
          '2025-01-31'
        );

        expect(result.source).toBe('aggregatedStats');
        expect(result.conversionRate).toBe(0.1);
        expect(result.checkoutRate).toBe(0.5);
      });

      it('should fallback to raw events', async () => {
        storeStatsRepo.getAggregatedMetrics!.mockResolvedValue({
          views: 0,
          purchases: 0,
          addToCarts: 0,
          revenue: 0,
          checkouts: 0,
        } as any);

        const rawData = {
          views: 500,
          purchases: 50,
          addToCarts: 150,
          revenue: 5000,
          checkouts: 75,
        };

        eventsRepo.aggregateStoreMetrics!.mockResolvedValue(rawData as any);

        const result = await service.computeStoreConversion(
          's1',
          '2025-01-01',
          '2025-01-31'
        );

        expect(result.source).toBe('rawEvents');
        expect(result.views).toBe(500);
      });
    });
  });

  describe('getTopProductsByConversion', () => {
    it('should delegate to events repository', async () => {
      const topProducts = [
        { productId: 'p1', conversionRate: 0.2, views: 100, purchases: 20 },
        { productId: 'p2', conversionRate: 0.15, views: 200, purchases: 30 },
      ];

      eventsRepo.getTopProductsByConversion!.mockResolvedValue(
        topProducts as any
      );

      const result = await service.getTopProductsByConversion(
        's1',
        '2025-01-01',
        '2025-01-31',
        15
      );

      expect(result).toEqual(topProducts);
      expect(eventsRepo.getTopProductsByConversion).toHaveBeenCalledWith('s1', {
        from: '2025-01-01',
        to: '2025-01-31',
        limit: 15,
      });
    });

    it('should use default limit', async () => {
      eventsRepo.getTopProductsByConversion!.mockResolvedValue([]);

      await service.getTopProductsByConversion('s1');

      expect(eventsRepo.getTopProductsByConversion).toHaveBeenCalledWith('s1', {
        from: undefined,
        to: undefined,
        limit: 10,
      });
    });
  });

  describe('getTopProductsByConversionCached', () => {
    it('should query products by conversion rate', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product 1',
          viewCount: 100,
          totalSales: 20,
          likeCount: 5,
          reviewCount: 3,
          averageRating: 4.5,
        },
        {
          id: 'p2',
          name: 'Product 2',
          viewCount: 200,
          totalSales: 30,
          likeCount: 10,
          reviewCount: 5,
          averageRating: 4.0,
        },
      ];

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      };

      productRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getTopProductsByConversionCached('s1', 15);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p1');
      expect(result[0].conversionRate).toBe(20); // (20/100) * 100
      expect(result[1].conversionRate).toBe(15); // (30/200) * 100
      expect(qb.limit).toHaveBeenCalledWith(15);
    });

    it('should filter deleted products', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      productRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.getTopProductsByConversionCached();

      expect(qb.where).toHaveBeenCalledWith('p.deletedAt IS NULL');
    });

    it('should filter products with low views', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      productRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.getTopProductsByConversionCached();

      expect(qb.andWhere).toHaveBeenCalledWith('p.viewCount > :minViews', {
        minViews: 10,
      });
    });

    it('should filter by storeId when provided', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      productRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.getTopProductsByConversionCached('s1');

      expect(qb.andWhere).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
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
          averageRating: null,
        },
      ];

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      };

      productRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getTopProductsByConversionCached();

      expect(result[0].conversionRate).toBe(0);
    });
  });

  describe('getTopProductsByViews', () => {
    it('should query products ordered by views', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product 1',
          viewCount: 500,
          totalSales: 50,
          likeCount: 10,
          reviewCount: 5,
          averageRating: 4.5,
        },
        {
          id: 'p2',
          name: 'Product 2',
          viewCount: 400,
          totalSales: 40,
          likeCount: 8,
          reviewCount: 4,
          averageRating: 4.0,
        },
      ];

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      };

      productRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getTopProductsByViews('s1', 20);

      expect(result).toHaveLength(2);
      expect(result[0].viewCount).toBe(500);
      expect(qb.orderBy).toHaveBeenCalledWith('p.viewCount', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getTopStoresByRevenue', () => {
    it('should return top stores by revenue', async () => {
      const stores = [
        {
          id: 's1',
          name: 'Store 1',
          productCount: 50,
          followerCount: 200,
          orderCount: 100,
          totalRevenue: 10000,
        },
        {
          id: 's2',
          name: 'Store 2',
          productCount: 40,
          followerCount: 150,
          orderCount: 80,
          totalRevenue: 8000,
        },
      ];

      storeRepo.find!.mockResolvedValue(stores as any);

      const result = await service.getTopStoresByRevenue(15);

      expect(result).toHaveLength(2);
      expect(result[0].totalRevenue).toBe(10000);
      expect(result[0].averageOrderValue).toBe(100); // 10000/100
      expect(storeRepo.find).toHaveBeenCalledWith({
        select: [
          'id',
          'name',
          'productCount',
          'followerCount',
          'orderCount',
          'totalRevenue',
        ],
        order: { totalRevenue: 'DESC' },
        take: 15,
      });
    });

    it('should handle stores with zero orders', async () => {
      const stores = [
        {
          id: 's1',
          name: 'Store',
          productCount: 10,
          followerCount: 50,
          orderCount: 0,
          totalRevenue: 0,
        },
      ];

      storeRepo.find!.mockResolvedValue(stores as any);

      const result = await service.getTopStoresByRevenue();

      expect(result[0].averageOrderValue).toBe(0);
    });
  });

  describe('getStoreStats', () => {
    it('should return store stats with summary', async () => {
      const agg = {
        views: 1000,
        purchases: 100,
        addToCarts: 250,
        revenue: 10000,
        checkouts: 120,
      };

      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue(agg as any);
      storeStatsRepo.find!.mockResolvedValue([]);

      const result = await service.getStoreStats('s1');

      expect(result.storeId).toBe('s1');
      expect(result.summary).toMatchObject({
        views: 1000,
        purchases: 100,
        conversionRate: 0.1,
        checkoutRate: 0.48,
      });
      expect(result.series).toEqual([]);
    });

    it('should include timeseries when date range provided', async () => {
      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 1000,
        purchases: 100,
        addToCarts: 250,
        revenue: 10000,
        checkouts: 120,
      } as any);

      const series = [
        { storeId: 's1', date: '2025-01-01', views: 100, purchases: 10 },
        { storeId: 's1', date: '2025-01-02', views: 120, purchases: 12 },
      ];

      storeStatsRepo.find!.mockResolvedValue(series as any);

      const result = await service.getStoreStats(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.series).toEqual(series);
      expect(storeStatsRepo.find).toHaveBeenCalled();
    });

    it('should handle only "from" date', async () => {
      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
        checkouts: 12,
      } as any);

      storeStatsRepo.find!.mockResolvedValue([]);

      await service.getStoreStats('s1', '2025-01-01');

      expect(storeStatsRepo.find).toHaveBeenCalled();
    });
  });

  describe('getProductStats', () => {
    it('should return product stats with summary', async () => {
      const agg = {
        views: 200,
        purchases: 20,
        addToCarts: 50,
        revenue: 2000,
      };

      productStatsRepo.getAggregatedMetrics!.mockResolvedValue(agg as any);
      productStatsRepo.find!.mockResolvedValue([]);

      const result = await service.getProductStats('p1');

      expect(result.productId).toBe('p1');
      expect(result.summary).toMatchObject({
        views: 200,
        purchases: 20,
        conversionRate: 0.1,
      });
    });

    it('should include timeseries when date range provided', async () => {
      productStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 200,
        purchases: 20,
        addToCarts: 50,
        revenue: 2000,
      } as any);

      const series = [
        { productId: 'p1', date: '2025-01-01', views: 20, purchases: 2 },
      ];

      productStatsRepo.find!.mockResolvedValue(series as any);

      const result = await service.getProductStats(
        'p1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.series).toEqual(series);
    });
  });
});
