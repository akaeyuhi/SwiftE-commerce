import { Test, TestingModule } from '@nestjs/testing';
import { FunnelAnalyticsService } from 'src/modules/analytics/services/funnel-analytics.service';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('FunnelAnalyticsService', () => {
  let service: FunnelAnalyticsService;
  let eventsRepo: Partial<MockedMethods<AnalyticsEventRepository>>;

  beforeEach(async () => {
    eventsRepo = createMock<AnalyticsEventRepository>([
      'getFunnelData',
      'getEventsForUserJourney',
      'getRevenueTrends',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunnelAnalyticsService,
        { provide: AnalyticsEventRepository, useValue: eventsRepo },
      ],
    }).compile();

    service = module.get<FunnelAnalyticsService>(FunnelAnalyticsService);
    jest.clearAllMocks();
  });

  describe('getFunnelAnalysis', () => {
    it('should return funnel analysis', async () => {
      eventsRepo.getFunnelData!.mockResolvedValue([1000, 250, 100]);

      const result = await service.getFunnelAnalysis(
        's1',
        'p1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.funnel).toEqual({
        views: 1000,
        addToCarts: 250,
        purchases: 100,
      });
      expect(result.rates.viewToCart).toBe('25.00'); // 250/1000 * 100
      expect(result.rates.cartToPurchase).toBe('40.00'); // 100/250 * 100
      expect(result.rates.overallConversion).toBe('10.00'); // 100/1000 * 100
    });

    it('should handle zero views', async () => {
      eventsRepo.getFunnelData!.mockResolvedValue([0, 0, 0]);

      const result = await service.getFunnelAnalysis('s1');

      expect(result.rates.viewToCart).toBe('0.00');
      expect(result.rates.cartToPurchase).toBe('0.00');
      expect(result.rates.overallConversion).toBe('0.00');
    });

    it('should handle zero addToCarts', async () => {
      eventsRepo.getFunnelData!.mockResolvedValue([1000, 0, 0]);

      const result = await service.getFunnelAnalysis('s1');

      expect(result.rates.viewToCart).toBe('0.00');
      expect(result.rates.cartToPurchase).toBe('0.00');
    });

    it('should call repository with correct parameters', async () => {
      eventsRepo.getFunnelData!.mockResolvedValue([100, 25, 10]);

      await service.getFunnelAnalysis('s1', 'p1', '2025-01-01', '2025-01-31');

      expect(eventsRepo.getFunnelData).toHaveBeenCalledWith(
        's1',
        'p1',
        '2025-01-01',
        '2025-01-31'
      );
    });
  });

  describe('getUserJourneyAnalysis', () => {
    it('should analyze user journeys', async () => {
      const events = [
        {
          userId: 'u1',
          eventType: 'view',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u1',
          eventType: 'addToCart',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u1',
          eventType: 'purchase',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u2',
          eventType: 'view',
          productId: 'p2',
          timestamp: new Date(),
        },
        {
          userId: 'u2',
          eventType: 'addToCart',
          productId: 'p2',
          timestamp: new Date(),
        },
      ];

      eventsRepo.getEventsForUserJourney!.mockResolvedValue(events as any);

      const result = await service.getUserJourneyAnalysis(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.summary.totalUsers).toBe(2);
      expect(result.summary.convertedUsers).toBe(1); // Only u1 completed purchase
      expect(result.summary.conversionRate).toBe(50); // 1/2 * 100
      expect(result.summary.averageJourneyLength).toBe(2.5); // (3+2)/2
    });

    it('should identify common paths', async () => {
      const events = [
        {
          userId: 'u1',
          eventType: 'view',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u1',
          eventType: 'addToCart',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u2',
          eventType: 'view',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u2',
          eventType: 'addToCart',
          productId: 'p1',
          timestamp: new Date(),
        },
      ];

      eventsRepo.getEventsForUserJourney!.mockResolvedValue(events as any);

      const result = await service.getUserJourneyAnalysis('s1');

      expect(result.commonPaths).toBeDefined();
      expect(result.commonPaths.length).toBeGreaterThan(0);
      expect(result.commonPaths[0]).toHaveProperty('path');
      expect(result.commonPaths[0]).toHaveProperty('userCount');
    });

    it('should identify drop-off points', async () => {
      const events = [
        {
          userId: 'u1',
          eventType: 'view',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u2',
          eventType: 'view',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: 'u2',
          eventType: 'addToCart',
          productId: 'p1',
          timestamp: new Date(),
        },
      ];

      eventsRepo.getEventsForUserJourney!.mockResolvedValue(events as any);

      const result = await service.getUserJourneyAnalysis('s1');

      expect(result.dropOffPoints).toBeDefined();
      expect(result.dropOffPoints.length).toBeGreaterThan(0);
    });

    it('should handle empty journey data', async () => {
      eventsRepo.getEventsForUserJourney!.mockResolvedValue([]);

      const result = await service.getUserJourneyAnalysis('s1');

      expect(result.summary.totalUsers).toBe(0);
      expect(result.summary.averageJourneyLength).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
    });

    it('should limit common paths to top 10', async () => {
      // Create 15 different user journeys
      const events = Array.from({ length: 15 }, (_, i) => [
        {
          userId: `u${i}`,
          eventType: 'view',
          productId: 'p1',
          timestamp: new Date(),
        },
        {
          userId: `u${i}`,
          eventType: 'addToCart',
          productId: 'p1',
          timestamp: new Date(),
        },
      ]).flat();

      eventsRepo.getEventsForUserJourney!.mockResolvedValue(events as any);

      const result = await service.getUserJourneyAnalysis('s1');

      expect(result.commonPaths.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getCohortAnalysis', () => {
    it('should return placeholder message', async () => {
      const result = await service.getCohortAnalysis(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.message).toContain('Cohort analysis');
      expect(result.storeId).toBe('s1');
      expect(result.dateRange).toEqual({
        from: '2025-01-01',
        to: '2025-01-31',
      });
    });
  });

  describe('getRevenueTrends', () => {
    it('should return revenue trends', async () => {
      const trends = [
        { date: '2025-01-01', revenue: 1000, transactions: 10 },
        { date: '2025-01-02', revenue: 1500, transactions: 15 },
      ];

      eventsRepo.getRevenueTrends!.mockResolvedValue(trends as any);

      const result = await service.getRevenueTrends(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(trends);
      expect(eventsRepo.getRevenueTrends).toHaveBeenCalledWith(
        's1',
        '2025-01-01',
        '2025-01-31'
      );
    });

    it('should work without date range', async () => {
      eventsRepo.getRevenueTrends!.mockResolvedValue([]);

      await service.getRevenueTrends('s1');

      expect(eventsRepo.getRevenueTrends).toHaveBeenCalledWith(
        's1',
        undefined,
        undefined
      );
    });
  });
});
