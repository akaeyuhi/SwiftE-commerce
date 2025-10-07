import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { createMock, MockedMethods } from 'test/unit/helpers';

import { EventTrackingService } from 'src/modules/analytics/services/event-tracking.service';
import { QuickStatsService } from 'src/modules/analytics/services/quick-stats.service';
import { ConversionAnalyticsService } from 'src/modules/analytics/services/conversion-analytics.service';
import { RatingAnalyticsService } from 'src/modules/analytics/services/rating-analytics.service';
import { FunnelAnalyticsService } from 'src/modules/analytics/services/funnel-analytics.service';
import { ComparisonAnalyticsService } from 'src/modules/analytics/services/comparison-analytics.service';
import { PerformanceAnalyticsService } from 'src/modules/analytics/services/performance-analytics.service';
import { DataSyncService } from 'src/modules/analytics/services/data-sync.service';
import { HealthCheckService } from 'src/modules/analytics/services/health-check.service';

describe('AnalyticsService (Orchestrator)', () => {
  let service: AnalyticsService;
  let eventTracking: Partial<MockedMethods<EventTrackingService>>;
  let quickStats: Partial<MockedMethods<QuickStatsService>>;
  let conversionAnalytics: Partial<MockedMethods<ConversionAnalyticsService>>;
  let ratingAnalytics: Partial<MockedMethods<RatingAnalyticsService>>;
  let funnelAnalytics: Partial<MockedMethods<FunnelAnalyticsService>>;
  let comparisonAnalytics: Partial<MockedMethods<ComparisonAnalyticsService>>;
  let performanceAnalytics: Partial<MockedMethods<PerformanceAnalyticsService>>;
  let dataSync: Partial<MockedMethods<DataSyncService>>;
  let healthCheck: Partial<MockedMethods<HealthCheckService>>;

  beforeEach(async () => {
    eventTracking = createMock<EventTrackingService>([
      'trackEvent',
      'recordEvent',
      'batchTrack',
    ]);

    quickStats = createMock<QuickStatsService>([
      'getProductQuickStats',
      'getStoreQuickStats',
      'getBatchProductStats',
    ]);

    conversionAnalytics = createMock<ConversionAnalyticsService>([
      'computeProductConversion',
      'computeStoreConversion',
      'getTopProductsByConversion',
      'getTopProductsByConversionCached',
      'getTopProductsByViews',
      'getTopStoresByRevenue',
      'getStoreStats',
      'getProductStats',
    ]);

    ratingAnalytics = createMock<RatingAnalyticsService>([
      'recomputeProductRating',
      'getStoreRatingsSummary',
    ]);

    funnelAnalytics = createMock<FunnelAnalyticsService>([
      'getFunnelAnalysis',
      'getUserJourneyAnalysis',
      'getCohortAnalysis',
      'getRevenueTrends',
    ]);

    comparisonAnalytics = createMock<ComparisonAnalyticsService>([
      'getStoreComparison',
      'getProductComparison',
      'getPeriodComparison',
    ]);

    performanceAnalytics = createMock<PerformanceAnalyticsService>([
      'getTopPerformingStores',
      'getTopPerformingProducts',
      'getUnderperformingAnalysis',
    ]);

    dataSync = createMock<DataSyncService>(['syncCachedStatsWithAnalytics']);

    healthCheck = createMock<HealthCheckService>(['healthCheck', 'getStats']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: EventTrackingService, useValue: eventTracking },
        { provide: QuickStatsService, useValue: quickStats },
        { provide: ConversionAnalyticsService, useValue: conversionAnalytics },
        { provide: RatingAnalyticsService, useValue: ratingAnalytics },
        { provide: FunnelAnalyticsService, useValue: funnelAnalytics },
        { provide: ComparisonAnalyticsService, useValue: comparisonAnalytics },
        {
          provide: PerformanceAnalyticsService,
          useValue: performanceAnalytics,
        },
        { provide: DataSyncService, useValue: dataSync },
        { provide: HealthCheckService, useValue: healthCheck },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  describe('Event Tracking Delegation', () => {
    it('should delegate trackEvent to EventTrackingService', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      eventTracking.trackEvent!.mockResolvedValue(undefined);

      await service.trackEvent(dto);

      expect(eventTracking.trackEvent).toHaveBeenCalledWith(dto);
      expect(eventTracking.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('should delegate recordEvent to EventTrackingService', async () => {
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.PURCHASE,
        invokedOn: 'product',
        productId: 'p1',
        value: 100,
      };

      const savedEvent = { id: 'e1', ...dto };
      eventTracking.recordEvent!.mockResolvedValue(savedEvent as any);

      const result = await service.recordEvent(dto);

      expect(result).toEqual(savedEvent);
      expect(eventTracking.recordEvent).toHaveBeenCalledWith(dto);
    });

    it('should delegate batchTrack to EventTrackingService', async () => {
      const events: RecordEventDto[] = [
        {
          storeId: 's1',
          eventType: AnalyticsEventType.VIEW,
          invokedOn: 'product',
        },
        {
          storeId: 's1',
          eventType: AnalyticsEventType.PURCHASE,
          invokedOn: 'product',
        },
      ];

      eventTracking.batchTrack!.mockResolvedValue(undefined as any);

      await service.batchTrack(events);

      expect(eventTracking.batchTrack).toHaveBeenCalledWith(events);
    });
  });

  describe('Quick Stats Delegation', () => {
    it('should delegate getProductQuickStats', async () => {
      const stats = { views: 100, purchases: 10 };
      quickStats.getProductQuickStats!.mockResolvedValue(stats as any);

      const result = await service.getProductQuickStats('p1');

      expect(result).toEqual(stats);
      expect(quickStats.getProductQuickStats).toHaveBeenCalledWith('p1');
    });

    it('should delegate getStoreQuickStats', async () => {
      const stats = { views: 1000, purchases: 100 };
      quickStats.getStoreQuickStats!.mockResolvedValue(stats as any);

      const result = await service.getStoreQuickStats('s1');

      expect(result).toEqual(stats);
      expect(quickStats.getStoreQuickStats).toHaveBeenCalledWith('s1');
    });

    it('should delegate getBatchProductStats', async () => {
      const stats = { p1: { views: 100 }, p2: { views: 200 } };
      quickStats.getBatchProductStats!.mockResolvedValue(stats as any);

      const result = await service.getBatchProductStats(['p1', 'p2']);

      expect(result).toEqual(stats);
      expect(quickStats.getBatchProductStats).toHaveBeenCalledWith([
        'p1',
        'p2',
      ]);
    });
  });

  describe('Conversion Analytics Delegation', () => {
    it('should delegate computeProductConversion', async () => {
      const conversion = {
        productId: 'p1',
        views: 100,
        purchases: 10,
        conversionRate: 0.1,
      };
      conversionAnalytics.computeProductConversion!.mockResolvedValue(
        conversion as any
      );

      const result = await service.computeProductConversion(
        'p1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(conversion);
      expect(conversionAnalytics.computeProductConversion).toHaveBeenCalledWith(
        'p1',
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should delegate computeStoreConversion', async () => {
      const conversion = {
        storeId: 's1',
        views: 1000,
        purchases: 100,
        conversionRate: 0.1,
      };
      conversionAnalytics.computeStoreConversion!.mockResolvedValue(
        conversion as any
      );

      const result = await service.computeStoreConversion('s1');

      expect(result).toEqual(conversion);
      expect(conversionAnalytics.computeStoreConversion).toHaveBeenCalledWith(
        's1',
        undefined,
        undefined
      );
    });

    it('should delegate getTopProductsByConversion', async () => {
      const topProducts = [
        { productId: 'p1', conversionRate: 0.2 },
        { productId: 'p2', conversionRate: 0.15 },
      ];
      conversionAnalytics.getTopProductsByConversion!.mockResolvedValue(
        topProducts as any
      );

      const result = await service.getTopProductsByConversion(
        's1',
        undefined,
        undefined,
        5
      );

      expect(result).toEqual(topProducts);
      expect(
        conversionAnalytics.getTopProductsByConversion
      ).toHaveBeenCalledWith('s1', undefined, undefined, 5);
    });

    it('should delegate getStoreStats', async () => {
      const stats = { storeId: 's1', summary: { views: 1000 } };
      conversionAnalytics.getStoreStats!.mockResolvedValue(stats as any);

      const result = await service.getStoreStats(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(stats);
      expect(conversionAnalytics.getStoreStats).toHaveBeenCalledWith(
        's1',
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should delegate getProductStats', async () => {
      const stats = { productId: 'p1', summary: { views: 100 } };
      conversionAnalytics.getProductStats!.mockResolvedValue(stats as any);

      const result = await service.getProductStats('p1');

      expect(result).toEqual(stats);
      expect(conversionAnalytics.getProductStats).toHaveBeenCalledWith(
        'p1',
        undefined,
        undefined
      );
    });
  });

  describe('Rating Analytics Delegation', () => {
    it('should delegate recomputeProductRating', async () => {
      const rating = { averageRating: 4.5, totalReviews: 100 };
      ratingAnalytics.recomputeProductRating!.mockResolvedValue(rating as any);

      const result = await service.recomputeProductRating('p1');

      expect(result).toEqual(rating);
      expect(ratingAnalytics.recomputeProductRating).toHaveBeenCalledWith('p1');
    });

    it('should delegate getStoreRatingsSummary', async () => {
      const summary = { storeId: 's1', averageRating: 4.3 };
      ratingAnalytics.getStoreRatingsSummary!.mockResolvedValue(summary as any);

      const result = await service.getStoreRatingsSummary(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(summary);
      expect(ratingAnalytics.getStoreRatingsSummary).toHaveBeenCalledWith(
        's1',
        '2025-01-01',
        '2025-01-31'
      );
    });
  });

  describe('Funnel Analytics Delegation', () => {
    it('should delegate getFunnelAnalysis', async () => {
      const funnel = {
        funnel: { views: 1000, addToCarts: 250, purchases: 100 },
        rates: { viewToCart: '25.00', cartToPurchase: '40.00' },
      };
      funnelAnalytics.getFunnelAnalysis!.mockResolvedValue(funnel as any);

      const result = await service.getFunnelAnalysis(
        's1',
        'p1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(funnel);
      expect(funnelAnalytics.getFunnelAnalysis).toHaveBeenCalledWith(
        's1',
        'p1',
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should delegate getUserJourneyAnalysis', async () => {
      const journey = { commonPaths: [], dropOffPoints: [] };
      funnelAnalytics.getUserJourneyAnalysis!.mockResolvedValue(journey as any);

      const result = await service.getUserJourneyAnalysis('s1');

      expect(result).toEqual(journey);
      expect(funnelAnalytics.getUserJourneyAnalysis).toHaveBeenCalledWith(
        's1',
        undefined,
        undefined
      );
    });

    it('should delegate getRevenueTrends', async () => {
      const trends = [
        { date: '2025-01-01', revenue: 1000 },
        { date: '2025-01-02', revenue: 1500 },
      ];
      funnelAnalytics.getRevenueTrends!.mockResolvedValue(trends as any);

      const result = await service.getRevenueTrends('s1');

      expect(result).toEqual(trends);
      expect(funnelAnalytics.getRevenueTrends).toHaveBeenCalledWith(
        's1',
        undefined,
        undefined
      );
    });
  });

  describe('Comparison Analytics Delegation', () => {
    it('should delegate getStoreComparison', async () => {
      const comparison = { stores: [{ storeId: 's1' }, { storeId: 's2' }] };
      comparisonAnalytics.getStoreComparison!.mockResolvedValue(
        comparison as any
      );

      const result = await service.getStoreComparison(['s1', 's2']);

      expect(result).toEqual(comparison);
      expect(comparisonAnalytics.getStoreComparison).toHaveBeenCalledWith(
        ['s1', 's2'],
        undefined,
        undefined
      );
    });

    it('should delegate getProductComparison', async () => {
      const comparison = {
        products: [{ productId: 'p1' }, { productId: 'p2' }],
      };
      comparisonAnalytics.getProductComparison!.mockResolvedValue(
        comparison as any
      );

      const result = await service.getProductComparison(
        ['p1', 'p2'],
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(comparison);
      expect(comparisonAnalytics.getProductComparison).toHaveBeenCalledWith(
        ['p1', 'p2'],
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should delegate getPeriodComparison', async () => {
      const comparison = { currentPeriod: {}, previousPeriod: {}, changes: {} };
      comparisonAnalytics.getPeriodComparison!.mockResolvedValue(
        comparison as any
      );

      const result = await service.getPeriodComparison(
        's1',
        undefined,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(comparison);
      expect(comparisonAnalytics.getPeriodComparison).toHaveBeenCalledWith(
        's1',
        undefined,
        '2025-01-01',
        '2025-01-31'
      );
    });
  });

  describe('Performance Analytics Delegation', () => {
    it('should delegate getTopPerformingStores', async () => {
      const stores = [{ storeId: 's1', revenue: 10000 }];
      performanceAnalytics.getTopPerformingStores!.mockResolvedValue(
        stores as any
      );

      const result = await service.getTopPerformingStores(
        10,
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(stores);
      expect(performanceAnalytics.getTopPerformingStores).toHaveBeenCalledWith(
        10,
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should delegate getTopPerformingProducts', async () => {
      const products = [{ productId: 'p1', revenue: 1000 }];
      performanceAnalytics.getTopPerformingProducts!.mockResolvedValue(
        products as any
      );

      const result = await service.getTopPerformingProducts('s1', 15);

      expect(result).toEqual(products);
      expect(
        performanceAnalytics.getTopPerformingProducts
      ).toHaveBeenCalledWith('s1', 15, undefined, undefined);
    });

    it('should delegate getUnderperformingAnalysis', async () => {
      const analysis = { underperforming: [], benchmarks: {} };
      performanceAnalytics.getUnderperformingAnalysis!.mockResolvedValue(
        analysis as any
      );

      const result = await service.getUnderperformingAnalysis('s1');

      expect(result).toEqual(analysis);
      expect(
        performanceAnalytics.getUnderperformingAnalysis
      ).toHaveBeenCalledWith('s1', undefined, undefined);
    });
  });

  describe('Data Sync Delegation', () => {
    it('should delegate syncCachedStatsWithAnalytics', async () => {
      const syncResult = { productId: 'p1', synced: true };
      dataSync.syncCachedStatsWithAnalytics!.mockResolvedValue(
        syncResult as any
      );

      const result = await service.syncCachedStatsWithAnalytics('p1');

      expect(result).toEqual(syncResult);
      expect(dataSync.syncCachedStatsWithAnalytics).toHaveBeenCalledWith(
        'p1',
        undefined
      );
    });
  });

  describe('Health Check Delegation', () => {
    it('should delegate healthCheck', async () => {
      const health = { healthy: true, message: 'OK' };
      healthCheck.healthCheck!.mockResolvedValue(health as any);

      const result = await service.healthCheck();

      expect(result).toEqual(health);
      expect(healthCheck.healthCheck).toHaveBeenCalled();
    });

    it('should delegate getStats', async () => {
      const stats = { totalEvents: 10000, recentEvents: 100 };
      healthCheck.getStats!.mockResolvedValue(stats as any);

      const result = await service.getStats();

      expect(result).toEqual(stats);
      expect(healthCheck.getStats).toHaveBeenCalled();
    });
  });

  describe('Aggregation Router', () => {
    describe('validateAggregator', () => {
      it('should validate known aggregators', () => {
        expect(() =>
          service['validateAggregator']('productConversion', {
            productId: 'p1',
          })
        ).not.toThrow();
      });

      it('should throw for unknown aggregator', () => {
        expect(() =>
          service['validateAggregator']('unknownAggregator')
        ).toThrow('Unknown aggregator: unknownAggregator');
      });

      it('should validate date format', () => {
        expect(() =>
          service['validateAggregator']('storeConversion', {
            storeId: 's1',
            from: 'invalid-date',
            to: '2025-01-31',
          })
        ).toThrow('Invalid date format');
      });

      it('should validate date order', () => {
        expect(() =>
          service['validateAggregator']('storeConversion', {
            storeId: 's1',
            from: '2025-12-31',
            to: '2025-01-01',
          })
        ).toThrow('from date must be before or equal to to date');
      });

      it('should prevent date ranges exceeding 365 days', () => {
        expect(() =>
          service['validateAggregator']('storeConversion', {
            storeId: 's1',
            from: '2023-01-01',
            to: '2025-01-01',
          })
        ).toThrow('Date range cannot exceed 365 days');
      });

      it('should require productId for product aggregators', () => {
        expect(() =>
          service['validateAggregator']('productConversion', {})
        ).toThrow('productConversion requires productId parameter');
      });

      it('should require storeId for store aggregators', () => {
        expect(() =>
          service['validateAggregator']('storeConversion', {})
        ).toThrow('storeConversion requires storeId parameter');
      });

      it('should validate limit range', () => {
        expect(() =>
          service['validateAggregator']('topProductsByConversion', {
            storeId: 's1',
            limit: 0,
          })
        ).toThrow('limit must be between 1 and 1000');

        expect(() =>
          service['validateAggregator']('topProductsByConversion', {
            storeId: 's1',
            limit: 1001,
          })
        ).toThrow('limit must be between 1 and 1000');
      });

      it('should allow valid limit values', () => {
        expect(() =>
          service['validateAggregator']('topProductsByConversion', {
            storeId: 's1',
            limit: 10,
          })
        ).not.toThrow();
      });
    });

    describe('runAggregation', () => {
      it('should route productConversion', async () => {
        const conversion = { productId: 'p1', conversionRate: 0.1 };
        conversionAnalytics.computeProductConversion!.mockResolvedValue(
          conversion as any
        );

        const result = await service['runAggregation']('productConversion', {
          productId: 'p1',
        });

        expect(result).toEqual(conversion);
        expect(
          conversionAnalytics.computeProductConversion
        ).toHaveBeenCalledWith('p1', undefined, undefined);
      });

      it('should route storeStats', async () => {
        const stats = { storeId: 's1', summary: {} };
        conversionAnalytics.getStoreStats!.mockResolvedValue(stats as any);

        const result = await service['runAggregation']('storeStats', {
          storeId: 's1',
        });

        expect(result).toEqual(stats);
      });

      it('should route funnelAnalysis', async () => {
        const funnel = { funnel: {}, rates: {} };
        funnelAnalytics.getFunnelAnalysis!.mockResolvedValue(funnel as any);

        const result = await service['runAggregation']('funnelAnalysis', {
          storeId: 's1',
        });

        expect(result).toEqual(funnel);
      });

      it('should throw for unimplemented aggregator', async () => {
        await expect(
          service['runAggregation']('unknownAggregator', {})
        ).rejects.toThrow('Aggregator unknownAggregator not implemented');
      });
    });
  });

  describe('Integration', () => {
    it('should handle service errors gracefully', async () => {
      conversionAnalytics.computeProductConversion!.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.computeProductConversion('p1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should properly pass parameters to delegated services', async () => {
      conversionAnalytics.getTopProductsByConversion!.mockResolvedValue(
        [] as any
      );

      await service.getTopProductsByConversion(
        's1',
        '2025-01-01',
        '2025-01-31',
        25
      );

      expect(
        conversionAnalytics.getTopProductsByConversion
      ).toHaveBeenCalledWith('s1', '2025-01-01', '2025-01-31', 25);
    });
  });
});
