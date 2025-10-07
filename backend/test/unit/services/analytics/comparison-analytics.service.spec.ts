import { Test, TestingModule } from '@nestjs/testing';
import { ComparisonAnalyticsService } from 'src/modules/analytics/services/comparison-analytics.service';
import { ConversionAnalyticsService } from 'src/modules/analytics/services/conversion-analytics.service';
import { createMock, MockedMethods } from 'test/utils/helpers';

describe('ComparisonAnalyticsService', () => {
  let service: ComparisonAnalyticsService;
  let conversionAnalytics: Partial<MockedMethods<ConversionAnalyticsService>>;

  beforeEach(async () => {
    conversionAnalytics = createMock<ConversionAnalyticsService>([
      'computeStoreConversion',
      'computeProductConversion',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonAnalyticsService,
        { provide: ConversionAnalyticsService, useValue: conversionAnalytics },
      ],
    }).compile();

    service = module.get<ComparisonAnalyticsService>(
      ComparisonAnalyticsService
    );
    jest.clearAllMocks();
  });

  describe('getStoreComparison', () => {
    it('should compare multiple stores', async () => {
      const store1 = {
        storeId: 's1',
        views: 1000,
        purchases: 100,
        conversionRate: 0.1,
      };
      const store2 = {
        storeId: 's2',
        views: 800,
        purchases: 80,
        conversionRate: 0.1,
      };

      conversionAnalytics
        .computeStoreConversion!.mockResolvedValueOnce(store1 as any)
        .mockResolvedValueOnce(store2 as any);

      const result = await service.getStoreComparison(['s1', 's2']);

      expect(result.stores).toHaveLength(2);
      expect(result.stores[0]).toEqual(store1);
      expect(result.stores[1]).toEqual(store2);
      expect(conversionAnalytics.computeStoreConversion).toHaveBeenCalledTimes(
        2
      );
    });

    it('should apply date range to all stores', async () => {
      conversionAnalytics.computeStoreConversion!.mockResolvedValue({} as any);

      await service.getStoreComparison(
        ['s1', 's2'],
        '2025-01-01',
        '2025-01-31'
      );

      expect(conversionAnalytics.computeStoreConversion).toHaveBeenCalledWith(
        's1',
        '2025-01-01',
        '2025-01-31'
      );
      expect(conversionAnalytics.computeStoreConversion).toHaveBeenCalledWith(
        's2',
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should handle empty store list', async () => {
      const result = await service.getStoreComparison([]);

      expect(result.stores).toEqual([]);
      expect(conversionAnalytics.computeStoreConversion).not.toHaveBeenCalled();
    });

    it('should handle single store', async () => {
      const store = { storeId: 's1', views: 1000 };
      conversionAnalytics.computeStoreConversion!.mockResolvedValue(
        store as any
      );

      const result = await service.getStoreComparison(['s1']);

      expect(result.stores).toHaveLength(1);
      expect(result.stores[0]).toEqual(store);
    });
  });

  describe('getProductComparison', () => {
    it('should compare multiple products', async () => {
      const product1 = { productId: 'p1', views: 100, purchases: 10 };
      const product2 = { productId: 'p2', views: 200, purchases: 20 };

      conversionAnalytics
        .computeProductConversion!.mockResolvedValueOnce(product1 as any)
        .mockResolvedValueOnce(product2 as any);

      const result = await service.getProductComparison(['p1', 'p2']);

      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toEqual(product1);
      expect(result.products[1]).toEqual(product2);
    });

    it('should apply date range to all products', async () => {
      conversionAnalytics.computeProductConversion!.mockResolvedValue(
        {} as any
      );

      await service.getProductComparison(
        ['p1', 'p2'],
        '2025-01-01',
        '2025-01-31'
      );

      expect(conversionAnalytics.computeProductConversion).toHaveBeenCalledWith(
        'p1',
        '2025-01-01',
        '2025-01-31'
      );
      expect(conversionAnalytics.computeProductConversion).toHaveBeenCalledWith(
        'p2',
        '2025-01-01',
        '2025-01-31'
      );
    });
  });

  describe('getPeriodComparison', () => {
    const currentMetrics = {
      views: 1000,
      purchases: 100,
      addToCarts: 250,
      revenue: 10000,
      conversionRate: 0.1,
    };

    const previousMetrics = {
      views: 800,
      purchases: 80,
      addToCarts: 200,
      revenue: 8000,
      conversionRate: 0.1,
    };

    it('should compare product periods', async () => {
      conversionAnalytics
        .computeProductConversion!.mockResolvedValueOnce(currentMetrics as any)
        .mockResolvedValueOnce(previousMetrics as any);

      const result = await service.getPeriodComparison(
        undefined,
        'p1',
        '2025-01-15',
        '2025-01-31'
      );

      expect(result.productId).toBe('p1');
      expect(result.currentPeriod.metrics).toEqual(currentMetrics);
      expect(result.previousPeriod.metrics).toEqual(previousMetrics);
      expect(result.changes.views).toBe(25); // (1000-800)/800 * 100
      expect(result.changes.purchases).toBe(25);
      expect(result.trend).toBe('up');
    });

    it('should compare store periods', async () => {
      conversionAnalytics
        .computeStoreConversion!.mockResolvedValueOnce(currentMetrics as any)
        .mockResolvedValueOnce(previousMetrics as any);

      const result = await service.getPeriodComparison(
        's1',
        undefined,
        '2025-01-15',
        '2025-01-31'
      );

      expect(result.storeId).toBe('s1');
      expect(result.currentPeriod.from).toBe('2025-01-15');
      expect(result.currentPeriod.to).toBe('2025-01-31');
    });

    it('should calculate previous period correctly', async () => {
      conversionAnalytics
        .computeProductConversion!.mockResolvedValueOnce(currentMetrics as any)
        .mockResolvedValueOnce(previousMetrics as any);

      const result = await service.getPeriodComparison(
        undefined,
        'p1',
        '2025-01-15',
        '2025-01-31'
      );

      expect(result.previousPeriod.from).toBe('2024-12-29');
      expect(result.previousPeriod.to).toBe('2025-01-14');
    });

    it('should throw error when dates missing', async () => {
      await expect(
        service.getPeriodComparison('s1', undefined)
      ).rejects.toThrow(
        'Both from and to dates are required for period comparison'
      );
    });

    it('should throw error when neither storeId nor productId provided', async () => {
      await expect(
        service.getPeriodComparison(
          undefined,
          undefined,
          '2025-01-01',
          '2025-01-31'
        )
      ).rejects.toThrow('Either storeId or productId is required');
    });

    it('should calculate negative changes correctly', async () => {
      const decreasingMetrics = {
        views: 600,
        purchases: 50,
        addToCarts: 150,
        revenue: 5000,
        conversionRate: 0.08,
      };

      conversionAnalytics
        .computeStoreConversion!.mockResolvedValueOnce(decreasingMetrics as any)
        .mockResolvedValueOnce(previousMetrics as any);

      const result = await service.getPeriodComparison(
        's1',
        undefined,
        '2025-01-15',
        '2025-01-31'
      );

      expect(result.changes.views).toBe(-25); // (600-800)/800 * 100
      expect(result.changes.revenue).toBe(-37); // (5000-8000)/8000 * 100
      expect(result.trend).toBe('down');
    });

    it('should handle zero previous values', async () => {
      const zeroMetrics = {
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
        conversionRate: 0,
      };

      conversionAnalytics
        .computeProductConversion!.mockResolvedValueOnce(currentMetrics as any)
        .mockResolvedValueOnce(zeroMetrics as any);

      const result = await service.getPeriodComparison(
        undefined,
        'p1',
        '2025-01-15',
        '2025-01-31'
      );

      expect(result.changes.views).toBe(100); // 100% increase from 0
      expect(result.changes.revenue).toBe(100);
    });

    it('should mark trend as stable when revenue unchanged', async () => {
      const sameMetrics = { ...currentMetrics };

      conversionAnalytics
        .computeStoreConversion!.mockResolvedValueOnce(sameMetrics as any)
        .mockResolvedValueOnce(sameMetrics as any);

      const result = await service.getPeriodComparison(
        's1',
        undefined,
        '2025-01-15',
        '2025-01-31'
      );

      expect(result.trend).toBe('stable');
    });
  });
});
