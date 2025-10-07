import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from 'src/modules/analytics/services/health-check.service';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let eventsRepo: Partial<MockedMethods<AnalyticsEventRepository>>;

  beforeEach(async () => {
    eventsRepo = createMock<AnalyticsEventRepository>(['count']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        { provide: AnalyticsEventRepository, useValue: eventsRepo },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy status when repository is accessible', async () => {
      eventsRepo.count!.mockResolvedValue(1);

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Analytics service operational');
      expect(result.details).toEqual({
        eventsRepo: 'connected',
        statsRepos: 'connected',
        queueService: 'available',
      });
    });

    it('should return unhealthy status on repository error', async () => {
      eventsRepo.count!.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toBe('Analytics service error');
      expect(result.details.error).toBe('Database connection failed');
    });

    it('should call count with take:1 for quick check', async () => {
      eventsRepo.count!.mockResolvedValue(1);

      await service.healthCheck();

      expect(eventsRepo.count).toHaveBeenCalledWith({ take: 1 });
    });

    it('should handle timeout errors', async () => {
      eventsRepo.count!.mockRejectedValue(new Error('Query timeout'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.error).toBe('Query timeout');
    });
  });

  describe('getStats', () => {
    it('should return total and recent event counts', async () => {
      eventsRepo
        .count!.mockResolvedValueOnce(10000) // Total events
        .mockResolvedValueOnce(150); // Recent events

      const result = await service.getStats();

      expect(result.totalEvents).toBe(10000);
      expect(result.recentEvents).toBe(150);
      expect(result.supportedAggregators).toBeGreaterThan(0);
      expect(eventsRepo.count).toHaveBeenCalledTimes(2);
    });

    it('should query recent events for last 24 hours', async () => {
      eventsRepo.count!.mockResolvedValue(100);

      await service.getStats();

      const secondCall = eventsRepo.count!.mock.calls[1][0] as any;
      expect(secondCall.where.createdAt).toBeDefined();
    });

    it('should return number of supported aggregators', async () => {
      eventsRepo.count!.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.supportedAggregators).toBe(17); // Should match the array length
    });

    it('should handle zero events', async () => {
      eventsRepo.count!.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.totalEvents).toBe(0);
      expect(result.recentEvents).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      eventsRepo.count!.mockRejectedValue(new Error('Database error'));

      await expect(service.getStats()).rejects.toThrow('Database error');
    });
  });

  describe('getSupportedAggregators', () => {
    it('should return comprehensive list of aggregators', () => {
      const aggregators = service['getSupportedAggregators']();

      expect(aggregators).toContain('productConversion');
      expect(aggregators).toContain('storeConversion');
      expect(aggregators).toContain('topProductsByConversion');
      expect(aggregators).toContain('funnelAnalysis');
      expect(aggregators).toContain('userJourney');
      expect(aggregators).toContain('revenueTrends');
      expect(aggregators).toContain('storeComparison');
      expect(aggregators).toContain('productComparison');
      expect(aggregators).toContain('periodComparison');
      expect(aggregators).toContain('topPerformingStores');
      expect(aggregators).toContain('topPerformingProducts');
      expect(aggregators).toContain('underperformingAnalysis');
    });

    it('should return array of strings', () => {
      const aggregators = service['getSupportedAggregators']();

      expect(Array.isArray(aggregators)).toBe(true);
      expect(aggregators.every((a) => typeof a === 'string')).toBe(true);
    });
  });
});
