import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { REVIEWS_REPOSITORY } from 'src/common/contracts/reviews.contract';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import {
  createMock,
  createRepositoryMock,
  MockedMethods,
} from '../../utils/helpers';
import { SelectQueryBuilder } from 'typeorm';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let queueService: Partial<MockedMethods<AnalyticsQueueService>>;
  let eventsRepo: Partial<MockedMethods<AnalyticsEventRepository>>;
  let storeStatsRepo: Partial<MockedMethods<StoreDailyStatsRepository>>;
  let productStatsRepo: Partial<MockedMethods<ProductDailyStatsRepository>>;
  let reviewsRepo: any;
  let queryBuilder: Partial<SelectQueryBuilder<any>>;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
      clone: jest.fn().mockReturnThis(),
    } as any;

    queueService = createMock<AnalyticsQueueService>(['addEvent']);

    eventsRepo = createRepositoryMock<AnalyticsEventRepository>([
      'create',
      'save',
      'aggregateProductRange',
      'aggregateStoreMetrics',
      'getTopProductsByConversion',
      'createQueryBuilder',
    ]);
    eventsRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);

    storeStatsRepo = createRepositoryMock<StoreDailyStatsRepository>([
      'getAggregateRange',
      'getAggregatedMetrics',
      'find',
    ]);

    productStatsRepo = createRepositoryMock<ProductDailyStatsRepository>([
      'getAggregateRange',
      'getAggregatedMetrics',
      'find',
    ]);

    reviewsRepo = {
      getRatingAggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsQueueService, useValue: queueService },
        { provide: AnalyticsEventRepository, useValue: eventsRepo },
        { provide: StoreDailyStatsRepository, useValue: storeStatsRepo },
        { provide: ProductDailyStatsRepository, useValue: productStatsRepo },
        { provide: REVIEWS_REPOSITORY, useValue: reviewsRepo },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should queue event for async processing', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      queueService.addEvent!.mockResolvedValue('job-1');

      await service.trackEvent(dto);

      expect(queueService.addEvent).toHaveBeenCalledWith(dto);
    });
  });

  describe('validateAggregator', () => {
    it('should validate known aggregators', () => {
      expect(() =>
        (service as any).validateAggregator('product_conversion', {
          productId: 'p1',
        })
      ).not.toThrow();
    });

    it('should throw for unknown aggregator', () => {
      expect(() =>
        (service as any).validateAggregator('unknown_aggregator')
      ).toThrow('Unknown aggregator: unknown_aggregator');
    });

    it('should validate date format', () => {
      expect(() =>
        (service as any).validateAggregator('store_conversion', {
          storeId: 's1',
          from: 'invalid-date',
          to: '2025-01-31',
        })
      ).toThrow('Invalid date format');
    });

    it('should validate date order', () => {
      expect(() =>
        (service as any).validateAggregator('store_conversion', {
          storeId: 's1',
          from: '2025-12-31',
          to: '2025-01-01',
        })
      ).toThrow('from date must be before or equal to to date');
    });

    it('should prevent date ranges exceeding 365 days', () => {
      expect(() =>
        (service as any).validateAggregator('store_conversion', {
          storeId: 's1',
          from: '2023-01-01',
          to: '2025-01-01',
        })
      ).toThrow('Date range cannot exceed 365 days');
    });

    it('should require productId for product aggregators', () => {
      expect(() =>
        (service as any).validateAggregator('product_conversion', {})
      ).toThrow('product_conversion requires productId parameter');
    });

    it('should require storeId for store aggregators', () => {
      expect(() =>
        (service as any).validateAggregator('store_conversion', {})
      ).toThrow('store_conversion requires storeId parameter');
    });

    it('should validate limit range', () => {
      expect(() =>
        (service as any).validateAggregator('top_products_by_conversion', {
          storeId: 's1',
          limit: 0,
        })
      ).toThrow('limit must be between 1 and 1000');

      expect(() =>
        (service as any).validateAggregator('top_products_by_conversion', {
          storeId: 's1',
          limit: 1001,
        })
      ).toThrow('limit must be between 1 and 1000');
    });

    it('should allow valid limit values', () => {
      expect(() =>
        (service as any).validateAggregator('top_products_by_conversion', {
          storeId: 's1',
          limit: 10,
        })
      ).not.toThrow();
    });
  });

  describe('aggregate', () => {
    it('should run aggregation successfully', async () => {
      productStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
      });

      const result = await service.aggregate('product_conversion', {
        productId: 'p1',
      });

      expect(result).toHaveProperty('conversionRate');
    });

    it('should throw for invalid aggregator', async () => {
      await expect(service.aggregate('invalid_aggregator', {})).rejects.toThrow(
        'Unknown aggregator: invalid_aggregator'
      );
    });
  });

  describe('computeProductConversion', () => {
    it('should compute from aggregated stats when available', async () => {
      productStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
      });

      const result = await service.computeProductConversion('p1');

      expect(result).toEqual({
        productId: 'p1',
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
        conversionRate: 0.1,
        addToCartRate: 0.25,
        source: 'aggregated_stats',
      });
    });

    it('should fallback to raw events when no aggregated data', async () => {
      productStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
      });

      eventsRepo.aggregateProductRange!.mockResolvedValue({
        views: 50,
        purchases: 5,
        addToCarts: 12,
        revenue: 500,
      });

      const result = await service.computeProductConversion('p1');

      expect(result).toEqual({
        productId: 'p1',
        views: 50,
        purchases: 5,
        addToCarts: 12,
        revenue: 500,
        conversionRate: 0.1,
        addToCartRate: 0.24,
        source: 'raw_events',
      });
    });

    it('should handle zero division safely', async () => {
      productStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
      });

      eventsRepo.aggregateProductRange!.mockResolvedValue({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
      });

      const result = await service.computeProductConversion('p1');

      expect(result.conversionRate).toBe(0);
      expect(result.addToCartRate).toBe(0);
    });

    it('should apply date range filters', async () => {
      productStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
      });

      await service.computeProductConversion('p1', '2025-01-01', '2025-01-31');

      expect(productStatsRepo.getAggregateRange).toHaveBeenCalledWith(
        'p1',
        '2025-01-01',
        '2025-01-31'
      );
    });
  });

  describe('computeStoreConversion', () => {
    it('should compute from aggregated stats when available', async () => {
      storeStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 500,
        purchases: 50,
        addToCarts: 125,
        revenue: 5000,
        checkouts: 60,
      });

      const result = await service.computeStoreConversion('s1');

      expect(result).toEqual({
        storeId: 's1',
        views: 500,
        purchases: 50,
        addToCarts: 125,
        revenue: 5000,
        checkouts: 60,
        conversionRate: 0.1,
        addToCartRate: 0.25,
        checkoutRate: 0.48,
        source: 'aggregated_stats',
      });
    });

    it('should fallback to raw events when no aggregated data', async () => {
      storeStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
        checkouts: 0,
      });

      eventsRepo.aggregateStoreMetrics!.mockResolvedValue({
        views: 250,
        purchases: 25,
        addToCarts: 62,
        revenue: 2500,
        checkouts: 30,
      });

      const result = await service.computeStoreConversion('s1');

      expect(result.source).toBe('raw_events');
      expect(result.conversionRate).toBe(0.1);
    });

    it('should calculate checkout rate correctly', async () => {
      storeStatsRepo.getAggregateRange!.mockResolvedValue({
        views: 1000,
        purchases: 50,
        addToCarts: 200,
        revenue: 5000,
        checkouts: 80,
      });

      const result = await service.computeStoreConversion('s1');

      expect(result.checkoutRate).toBe(0.4); // 80/200
    });
  });

  describe('getTopProductsByConversion', () => {
    it('should return top products by conversion rate', async () => {
      const topProducts = [
        { productId: 'p1', conversionRate: 0.2, views: 100, purchases: 20 },
        { productId: 'p2', conversionRate: 0.15, views: 200, purchases: 30 },
      ];

      eventsRepo.getTopProductsByConversion!.mockResolvedValue(
        topProducts as any
      );

      const result = await service.getTopProductsByConversion('s1');

      expect(result).toEqual(topProducts);
      expect(eventsRepo.getTopProductsByConversion).toHaveBeenCalledWith('s1', {
        from: undefined,
        to: undefined,
        limit: 10,
      });
    });

    it('should use custom limit', async () => {
      eventsRepo.getTopProductsByConversion!.mockResolvedValue([]);

      await service.getTopProductsByConversion('s1', undefined, undefined, 5);

      expect(eventsRepo.getTopProductsByConversion).toHaveBeenCalledWith('s1', {
        from: undefined,
        to: undefined,
        limit: 5,
      });
    });
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

      expect(reviewsRepo.getRatingAggregate).toHaveBeenCalledWith('p1');
      expect(result).toEqual(rating);
    });
  });

  describe('getStoreStats', () => {
    it('should return store stats with summary', async () => {
      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 1000,
        purchases: 100,
        addToCarts: 250,
        revenue: 10000,
        checkouts: 120,
      });

      storeStatsRepo.find!.mockResolvedValue([]);

      const result = await service.getStoreStats('s1');

      expect(result.storeId).toBe('s1');
      expect(result.summary).toEqual({
        views: 1000,
        purchases: 100,
        addToCarts: 250,
        revenue: 10000,
        checkouts: 120,
        conversionRate: 0.1,
        addToCartRate: 0.25,
        checkoutRate: 0.48,
      });
    });

    it('should include timeseries when date range provided', async () => {
      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 1000,
        purchases: 100,
        addToCarts: 250,
        revenue: 10000,
        checkouts: 120,
      });

      const series = [
        { date: '2025-01-01', views: 100, purchases: 10 },
        { date: '2025-01-02', views: 150, purchases: 15 },
      ];

      storeStatsRepo.find!.mockResolvedValue(series as any);

      const result = await service.getStoreStats(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.series).toEqual(series);
    });
  });

  describe('getProductStats', () => {
    it('should return product stats with rating', async () => {
      productStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 200,
        purchases: 20,
        addToCarts: 50,
        revenue: 2000,
      });

      productStatsRepo.find!.mockResolvedValue([]);

      const rating = { averageRating: 4.5, totalReviews: 50 };
      reviewsRepo.getRatingAggregate.mockResolvedValue(rating);

      const result = await service.getProductStats('p1');

      expect(result.productId).toBe('p1');
      expect(result.summary.views).toBe(200);
      expect(result.rating).toEqual(rating);
    });

    it('should include timeseries when date range provided', async () => {
      productStatsRepo.getAggregatedMetrics!.mockResolvedValue({
        views: 200,
        purchases: 20,
        addToCarts: 50,
        revenue: 2000,
      });

      const series = [
        { date: '2025-01-01', views: 20, purchases: 2 },
        { date: '2025-01-02', views: 25, purchases: 3 },
      ];

      productStatsRepo.find!.mockResolvedValue(series as any);
      reviewsRepo.getRatingAggregate.mockResolvedValue({});

      const result = await service.getProductStats(
        'p1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.series).toEqual(series);
    });
  });

  describe('getFunnelAnalysis', () => {
    it('should analyze conversion funnel', async () => {
      (queryBuilder.getCount as jest.Mock)!
        .mockResolvedValueOnce(1000) // views
        .mockResolvedValueOnce(250) // addToCarts
        .mockResolvedValueOnce(100); // purchases

      const result = await (service as any).getFunnelAnalysis('s1');

      expect(result.funnel).toEqual({
        views: 1000,
        addToCarts: 250,
        purchases: 100,
      });
      expect(result.rates.viewToCart).toBe('25.00');
      expect(result.rates.cartToPurchase).toBe('40.00');
      expect(result.rates.overallConversion).toBe('10.00');
    });

    it('should handle zero values safely', async () => {
      (queryBuilder.getCount as jest.Mock)!
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await (service as any).getFunnelAnalysis('s1');

      expect(result.rates.viewToCart).toBe('0.00');
      expect(result.rates.cartToPurchase).toBe('0.00');
      expect(result.rates.overallConversion).toBe('0.00');
    });
  });

  describe('getRevenueTrends', () => {
    it('should return revenue trends over time', async () => {
      const trends = [
        { date: '2025-01-01', revenue: '1000', transactions: '10' },
        { date: '2025-01-02', revenue: '1500', transactions: '15' },
      ];

      (queryBuilder.getRawMany as jest.Mock)!.mockResolvedValue(trends);

      const result = await (service as any).getRevenueTrends('s1');

      expect(result).toEqual(trends);
    });

    it('should filter by storeId when provided', async () => {
      (queryBuilder.getRawMany as jest.Mock)!.mockResolvedValue([]);

      await (service as any).getRevenueTrends('s1', '2025-01-01', '2025-01-31');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.storeId = :storeId',
        { storeId: 's1' }
      );
    });
  });

  describe('getStoreComparison', () => {
    it('should compare multiple stores', async () => {
      storeStatsRepo
        .getAggregateRange!.mockResolvedValueOnce({
          views: 1000,
          purchases: 100,
          addToCarts: 250,
          revenue: 10000,
          checkouts: 120,
        })
        .mockResolvedValueOnce({
          views: 800,
          purchases: 80,
          addToCarts: 200,
          revenue: 8000,
          checkouts: 100,
        });

      const result = await (service as any).getStoreComparison(['s1', 's2']);

      expect(result.stores).toHaveLength(2);
      expect(result.stores[0].storeId).toBe('s1');
      expect(result.stores[1].storeId).toBe('s2');
    });
  });

  describe('getProductComparison', () => {
    it('should compare multiple products', async () => {
      productStatsRepo
        .getAggregateRange!.mockResolvedValueOnce({
          views: 200,
          purchases: 20,
          addToCarts: 50,
          revenue: 2000,
        })
        .mockResolvedValueOnce({
          views: 150,
          purchases: 15,
          addToCarts: 40,
          revenue: 1500,
        });

      const result = await (service as any).getProductComparison(['p1', 'p2']);

      expect(result.products).toHaveLength(2);
      expect(result.products[0].productId).toBe('p1');
      expect(result.products[1].productId).toBe('p2');
    });
  });

  describe('recordEvent (deprecated)', () => {
    it('should record event directly', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
        productId: 'p1',
      };

      const createdEvent = { id: 'e1', ...dto };
      eventsRepo.create!.mockReturnValue(createdEvent as any);
      eventsRepo.save!.mockResolvedValue(createdEvent as any);

      const result = await service.recordEvent(dto);

      expect(eventsRepo.create).toHaveBeenCalled();
      expect(eventsRepo.save).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual(createdEvent);
    });

    it('should set defaults for missing fields', async () => {
      const dto: RecordEventDto = {
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      } as any;

      eventsRepo.create!.mockReturnValue({} as any);
      eventsRepo.save!.mockResolvedValue({} as any);

      await service.recordEvent(dto);

      expect(eventsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: null,
          productId: null,
          userId: null,
          value: null,
          meta: null,
        })
      );
    });
  });

  describe('getSupportedAggregators', () => {
    it('should return list of supported aggregators', () => {
      const aggregators = service.getSupportedAggregators();

      expect(Array.isArray(aggregators)).toBe(true);
      expect(aggregators).toContain('product_conversion');
      expect(aggregators).toContain('store_conversion');
      expect(aggregators).toContain('top_products_by_conversion');
    });
  });

  describe('getAggregationSchema', () => {
    it('should return schema for known aggregator', () => {
      const schema = service.getAggregationSchema('productConversion');

      expect(schema).toBeDefined();
      expect(schema!.name).toBe('product_conversion');
    });

    it('should return null for unknown aggregator', () => {
      const schema = service.getAggregationSchema('unknown');

      expect(schema).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      productStatsRepo.getAggregateRange!.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.computeProductConversion('p1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle invalid aggregation requests', async () => {
      await expect(
        service.aggregate('invalid_aggregator', {})
      ).rejects.toThrow();
    });
  });
});
