import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceAnalyticsService } from 'src/modules/analytics/services/performance-analytics.service';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { ConversionAnalyticsService } from 'src/modules/analytics/services/conversion-analytics.service';
import { Repository } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { TopPerformingStores } from 'src/modules/analytics/types';

describe('PerformanceAnalyticsService', () => {
  let service: PerformanceAnalyticsService;
  let storeStatsRepo: Partial<MockedMethods<StoreDailyStatsRepository>>;
  let productStatsRepo: Partial<MockedMethods<ProductDailyStatsRepository>>;
  let storeRepo: Partial<MockedMethods<Repository<Store>>>;
  let conversionAnalytics: Partial<MockedMethods<ConversionAnalyticsService>>;

  beforeEach(async () => {
    storeStatsRepo = createMock<StoreDailyStatsRepository>([
      'getTopStoreDaily',
      'getUnderperformingStores',
    ]);
    productStatsRepo = createMock<ProductDailyStatsRepository>([
      'getUnderperformingProducts',
    ]);
    storeRepo = createMock<Repository<Store>>(['find']);
    conversionAnalytics = createMock<ConversionAnalyticsService>([
      'getTopStoresByRevenue',
      'getTopProductsByConversion',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceAnalyticsService,
        { provide: StoreDailyStatsRepository, useValue: storeStatsRepo },
        { provide: ProductDailyStatsRepository, useValue: productStatsRepo },
        { provide: getRepositoryToken(Store), useValue: storeRepo },
        { provide: ConversionAnalyticsService, useValue: conversionAnalytics },
      ],
    }).compile();

    service = module.get<PerformanceAnalyticsService>(
      PerformanceAnalyticsService
    );
    jest.clearAllMocks();
  });

  describe('getTopPerformingStores', () => {
    it('should use cached stats when no date range', async () => {
      const topStores = [
        { storeId: 's1', totalRevenue: 10000 },
        { storeId: 's2', totalRevenue: 8000 },
      ];

      conversionAnalytics.getTopStoresByRevenue!.mockResolvedValue(
        topStores as any
      );

      const result = await service.getTopPerformingStores(10);

      expect(result).toEqual(topStores);
      expect(conversionAnalytics.getTopStoresByRevenue).toHaveBeenCalledWith(
        10
      );
      expect(storeStatsRepo.getTopStoreDaily).not.toHaveBeenCalled();
    });

    it('should query daily stats with date range', async () => {
      const dailyStats = [
        {
          storeId: 's1',
          totalViews: '1000',
          totalPurchases: '100',
          totalRevenue: '10000.00',
          totalAddToCarts: '250',
        },
        {
          storeId: 's2',
          totalViews: '800',
          totalPurchases: '80',
          totalRevenue: '8000.00',
          totalAddToCarts: '200',
        },
      ];

      const stores = [
        { id: 's1', name: 'Store 1' },
        { id: 's2', name: 'Store 2' },
      ];

      storeStatsRepo.getTopStoreDaily!.mockResolvedValue(dailyStats as any);
      storeRepo.find!.mockResolvedValue(stores as any);

      const result = (await service.getTopPerformingStores(
        10,
        '2025-01-01',
        '2025-01-31'
      )) as TopPerformingStores;

      expect(result.dateRange).toEqual({
        from: '2025-01-01',
        to: '2025-01-31',
      });
      expect(result.stores).toHaveLength(2);
      expect(result.stores[0]).toMatchObject({
        rank: 1,
        storeId: 's1',
        storeName: 'Store 1',
        views: 1000,
        purchases: 100,
        revenue: 10000,
        conversionRate: 10, // (100/1000) * 100
      });
    });

    it('should calculate conversion rate correctly', async () => {
      const dailyStats = [
        {
          storeId: 's1',
          totalViews: '500',
          totalPurchases: '25',
          totalRevenue: '2500.00',
          totalAddToCarts: '100',
        },
      ];

      storeStatsRepo.getTopStoreDaily!.mockResolvedValue(dailyStats as any);
      storeRepo.find!.mockResolvedValue([{ id: 's1', name: 'Store' }] as any);

      const result = (await service.getTopPerformingStores(
        10,
        '2025-01-01',
        '2025-01-31'
      )) as TopPerformingStores;

      expect(result.stores[0].conversionRate).toBe(5); // (25/500) * 100
    });

    it('should calculate average order value', async () => {
      const dailyStats = [
        {
          storeId: 's1',
          totalViews: '1000',
          totalPurchases: '50',
          totalRevenue: '5000.00',
          totalAddToCarts: '200',
        },
      ];

      storeStatsRepo.getTopStoreDaily!.mockResolvedValue(dailyStats as any);
      storeRepo.find!.mockResolvedValue([{ id: 's1', name: 'Store' }] as any);

      const result = (await service.getTopPerformingStores(
        10,
        '2025-01-01',
        '2025-01-31'
      )) as TopPerformingStores;

      expect(result.stores[0].averageOrderValue).toBe(100); // 5000/50
    });

    it('should handle stores with zero views', async () => {
      const dailyStats = [
        {
          storeId: 's1',
          totalViews: '0',
          totalPurchases: '0',
          totalRevenue: '0',
          totalAddToCarts: '0',
        },
      ];

      storeStatsRepo.getTopStoreDaily!.mockResolvedValue(dailyStats as any);
      storeRepo.find!.mockResolvedValue([{ id: 's1', name: 'Store' }] as any);

      const result = (await service.getTopPerformingStores(
        10,
        '2025-01-01',
        '2025-01-31'
      )) as TopPerformingStores;

      expect(result.stores[0].conversionRate).toBe(0);
      expect(result.stores[0].averageOrderValue).toBe(0);
    });

    it('should handle unknown store names', async () => {
      const dailyStats = [
        {
          storeId: 's999',
          totalViews: '100',
          totalPurchases: '10',
          totalRevenue: '1000',
          totalAddToCarts: '25',
        },
      ];

      storeStatsRepo.getTopStoreDaily!.mockResolvedValue(dailyStats as any);
      storeRepo.find!.mockResolvedValue([]);

      const result = (await service.getTopPerformingStores(
        10,
        '2025-01-01',
        '2025-01-31'
      )) as TopPerformingStores;

      expect(result.stores[0].storeName).toBe('Unknown');
    });
  });

  describe('getTopPerformingProducts', () => {
    it('should delegate to conversion analytics', async () => {
      const topProducts = [
        { productId: 'p1', conversionRate: 0.2 },
        { productId: 'p2', conversionRate: 0.15 },
      ];

      conversionAnalytics.getTopProductsByConversion!.mockResolvedValue(
        topProducts as any
      );

      const result = await service.getTopPerformingProducts(
        's1',
        15,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(topProducts);
      expect(
        conversionAnalytics.getTopProductsByConversion
      ).toHaveBeenCalledWith('s1', '2025-01-01', '2025-01-31', 15);
    });

    it('should use default limit', async () => {
      conversionAnalytics.getTopProductsByConversion!.mockResolvedValue([]);

      await service.getTopPerformingProducts('s1');

      expect(
        conversionAnalytics.getTopProductsByConversion
      ).toHaveBeenCalledWith('s1', undefined, undefined, 10);
    });
  });

  describe('getUnderperformingAnalysis', () => {
    it('should analyze underperforming products', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product 1',
          views: '100',
          purchases: '2',
          revenue: '200.00',
        },
        {
          id: 'p2',
          name: 'Product 2',
          views: '200',
          purchases: '10',
          revenue: '1000.00',
        },
        {
          id: 'p3',
          name: 'Product 3',
          views: '150',
          purchases: '5',
          revenue: '500.00',
        },
      ];

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.type).toBe('product');
      expect(result.storeId).toBe('s1');
      expect(result.benchmarks).toBeDefined();
      expect(result.benchmarks?.medianConversionRate).toBeGreaterThan(0);
    });

    it('should analyze underperforming stores when no storeId', async () => {
      const stores = [
        {
          id: 's1',
          name: 'Store 1',
          views: '100',
          purchases: '2',
          revenue: '200.00',
        },
        {
          id: 's2',
          name: 'Store 2',
          views: '200',
          purchases: '10',
          revenue: '1000.00',
        },
      ];

      storeStatsRepo.getUnderperformingStores!.mockResolvedValue(stores as any);

      const result = await service.getUnderperformingAnalysis(
        undefined,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.type).toBe('store');
      expect(storeStatsRepo.getUnderperformingStores).toHaveBeenCalledWith(
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should filter out items with less than 10 views', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product 1',
          views: '5',
          purchases: '1',
          revenue: '100.00',
        },
        {
          id: 'p2',
          name: 'Product 2',
          views: '100',
          purchases: '10',
          revenue: '1000.00',
        },
      ];

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      expect(result.benchmarks?.totalAnalyzed).toBe(1); // Only p2 has >10 views
    });

    it('should return message when insufficient data', async () => {
      productStatsRepo.getUnderperformingProducts!.mockResolvedValue([
        {
          id: 'p1',
          name: 'Product',
          views: '5',
          purchases: '1',
          revenue: '100',
        },
      ]);

      const result = await service.getUnderperformingAnalysis('s1');

      expect(result.message).toContain('Not enough data');
      expect(result.underperforming).toEqual([]);
    });

    it('should calculate conversion and revenue gaps', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Low Performer',
          views: '100',
          purchases: '1',
          revenue: '100.00',
        },
        {
          id: 'p2',
          name: 'Mid Performer',
          views: '100',
          purchases: '5',
          revenue: '500.00',
        },
        {
          id: 'p3',
          name: 'High Performer',
          views: '100',
          purchases: '10',
          revenue: '1000.00',
        },
      ];

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      const lowPerformer = result.underperforming.find((p) => p.id === 'p1');
      expect(lowPerformer).toBeDefined();
      expect(lowPerformer?.conversionGap).toBeGreaterThan(50);
      expect(lowPerformer?.revenueGap).toBeGreaterThan(50);
    });

    it('should provide recommendations for underperformers', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Product',
          views: '50',
          purchases: '1',
          revenue: '50.00',
        },
        {
          id: 'p2',
          name: 'Product 2',
          views: '100',
          purchases: '10',
          revenue: '1000.00',
        },
      ];

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      const recommendations = result.underperforming.find((p) => p.id === 'p1');
      expect(recommendations?.issues).toBeDefined();
      expect(recommendations?.recommendedActions).toBeDefined();
      expect(recommendations?.issues.length).toBeGreaterThan(0);
    });

    it('should identify low visibility issues', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Low Performer',
          views: '50',
          purchases: '1',
          revenue: '100.00',
        },
        {
          id: 'p2',
          name: 'Medium Performer',
          views: '1000',
          purchases: '100',
          revenue: '10000.00',
        },
        {
          id: 'p3',
          name: 'High Performer',
          views: '2000',
          purchases: '500',
          revenue: '50000.00',
        },
      ];

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      const item = result.underperforming.find((p) => p.id === 'p1');
      expect(item).toBeDefined();
      expect(item?.views).toBeLessThan(100);
      expect(item?.issues).toContain('Low visibility');
    });
    it('should sort underperforming items by overall score', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Worst Performer',
          views: '100',
          purchases: '0', // 0% conversion
          revenue: '0.00',
        },
        {
          id: 'p2',
          name: 'Bad Performer',
          views: '100',
          purchases: '1', // 1% conversion
          revenue: '50.00',
        },
        {
          id: 'p3',
          name: 'Good Performer',
          views: '100',
          purchases: '50', // 50% conversion
          revenue: '5000.00',
        },
      ];

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      // Should have underperforming items
      expect(result.underperforming.length).toBeGreaterThan(0);

      // Should be sorted by worst performers first (highest overall score)
      if (result.underperforming.length > 1) {
        expect(result.underperforming[0].overallScore).toBeGreaterThanOrEqual(
          result.underperforming[result.underperforming.length - 1].overallScore
        );
      }
    });

    it('should limit recommendations to top 10', async () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        id: `p${i}`,
        name: `Product ${i}`,
        views: '100',
        purchases: '1',
        revenue: '100.00',
      }));

      productStatsRepo.getUnderperformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      expect(result.underperforming.length).toBeLessThanOrEqual(10);
    });
  });
});
