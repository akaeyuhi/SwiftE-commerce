import { Test, TestingModule } from '@nestjs/testing';
import { DataSyncService } from 'src/modules/analytics/services/data-sync.service';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { Repository } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('DataSyncService', () => {
  let service: DataSyncService;
  let eventsRepo: Partial<MockedMethods<AnalyticsEventRepository>>;
  let storeStatsRepo: Partial<MockedMethods<StoreDailyStatsRepository>>;
  let productRepo: Partial<MockedMethods<Repository<Product>>>;

  beforeEach(async () => {
    eventsRepo = createMock<AnalyticsEventRepository>([
      'aggregateProductMetrics',
    ]);
    storeStatsRepo = createMock<StoreDailyStatsRepository>([
      'getAggregatedMetrics',
    ]);
    productRepo = createMock<Repository<Product>>(['update']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSyncService,
        { provide: AnalyticsEventRepository, useValue: eventsRepo },
        { provide: StoreDailyStatsRepository, useValue: storeStatsRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<DataSyncService>(DataSyncService);
    jest.clearAllMocks();
  });

  describe('syncCachedStatsWithAnalytics', () => {
    it('should sync product stats when productId provided', async () => {
      const analytics = {
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 1000,
      };
      eventsRepo.aggregateProductMetrics!.mockResolvedValue(analytics as any);
      productRepo.update!.mockResolvedValue({} as any);

      const result = await service.syncCachedStatsWithAnalytics('p1');

      expect(result).toEqual({ productId: 'p1', synced: true });
      expect(eventsRepo.aggregateProductMetrics).toHaveBeenCalledWith('p1', {});
      expect(productRepo.update).toHaveBeenCalledWith('p1', {
        viewCount: 100,
        totalSales: 10,
      });
    });

    it('should sync store stats when storeId provided', async () => {
      const analytics = {
        views: 1000,
        purchases: 100,
        revenue: 10000,
        addToCarts: 250,
        checkouts: 120,
      };
      storeStatsRepo.getAggregatedMetrics!.mockResolvedValue(analytics as any);

      const result = await service.syncCachedStatsWithAnalytics(
        undefined,
        's1'
      );

      expect(result).toEqual({
        storeId: 's1',
        analytics: {
          views: 1000,
          purchases: 100,
          revenue: 10000,
        },
        message: 'Store stats are managed by triggers/subscribers',
      });
      expect(storeStatsRepo.getAggregatedMetrics).toHaveBeenCalledWith(
        's1',
        {}
      );
    });

    it('should return sync recommendation when neither provided', async () => {
      const result = await service.syncCachedStatsWithAnalytics();

      expect(result).toEqual({
        message: 'Full sync should be run as a background job',
        recommendation: 'Use a scheduled task or admin command',
      });
    });

    it('should handle zero values in product sync', async () => {
      const analytics = { views: 0, purchases: 0, addToCarts: 0, revenue: 0 };
      eventsRepo.aggregateProductMetrics!.mockResolvedValue(analytics as any);
      productRepo.update!.mockResolvedValue({} as any);

      await service.syncCachedStatsWithAnalytics('p1');

      expect(productRepo.update).toHaveBeenCalledWith('p1', {
        viewCount: 0,
        totalSales: 0,
      });
    });

    it('should handle null values in analytics', async () => {
      const analytics = {
        views: null,
        purchases: null,
        addToCarts: null,
        revenue: null,
      };
      eventsRepo.aggregateProductMetrics!.mockResolvedValue(analytics as any);
      productRepo.update!.mockResolvedValue({} as any);

      await service.syncCachedStatsWithAnalytics('p1');

      expect(productRepo.update).toHaveBeenCalledWith('p1', {
        viewCount: 0,
        totalSales: 0,
      });
    });
  });
});
