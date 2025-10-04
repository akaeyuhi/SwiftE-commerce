import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { StoreDailyStats } from 'src/entities/infrastructure/analytics/store-daily-stats.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from '../../../utils/helpers';

describe('StoreDailyStatsRepository', () => {
  let repo: StoreDailyStatsRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<StoreDailyStats>>>;

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
    } as any;

    manager = createMockEntityManager();
    manager.createQueryBuilder!.mockReturnValue(queryBuilder as any);

    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    repo = new StoreDailyStatsRepository(dataSource as any);

    jest.clearAllMocks();
  });

  describe('getAggregatedMetrics', () => {
    it('should return aggregated metrics for store', async () => {
      const rawResult = {
        views: '5000',
        purchases: '500',
        addToCarts: '1250',
        revenue: '50000.00',
        checkouts: '600',
      };

      queryBuilder.getRawOne!.mockResolvedValue(rawResult);

      const result = await repo.getAggregatedMetrics('s1');

      expect(result).toEqual({
        views: 5000,
        purchases: 500,
        addToCarts: 1250,
        revenue: 50000,
        checkouts: 600,
      });
      expect(queryBuilder.where).toHaveBeenCalledWith('s.storeId = :storeId', {
        storeId: 's1',
      });
    });

    it('should apply date range filters', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('s1', {
        from: '2025-01-01',
        to: '2025-12-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle null values with COALESCE', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      const result = await repo.getAggregatedMetrics('s1');

      expect(result.views).toBe(0);
      expect(result.revenue).toBe(0);
    });
  });

  describe('getDailyTimeseries', () => {
    it('should return daily timeseries data', async () => {
      const stats = [
        {
          id: '1',
          storeId: 's1',
          date: '2025-01-01',
          views: 500,
          purchases: 50,
        } as StoreDailyStats,
        {
          id: '2',
          storeId: 's1',
          date: '2025-01-02',
          views: 600,
          purchases: 60,
        } as StoreDailyStats,
      ];

      queryBuilder.getMany!.mockResolvedValue(stats);

      const result = await repo.getDailyTimeseries('s1');

      expect(result).toEqual(stats);
      expect(queryBuilder.where).toHaveBeenCalledWith('s.storeId = :storeId', {
        storeId: 's1',
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('s.date', 'ASC');
    });

    it('should apply date range filters', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getDailyTimeseries('s1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getTopStores', () => {
    it('should return top stores by revenue', async () => {
      const rawResults = [
        {
          storeId: 's1',
          views: '10000',
          purchases: '1000',
          revenue: '100000.00',
          conversionRate: '0.1',
        },
        {
          storeId: 's2',
          views: '8000',
          purchases: '800',
          revenue: '80000.00',
          conversionRate: '0.1',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopStores('revenue', { limit: 10 });

      expect(result).toEqual([
        {
          storeId: 's1',
          views: 10000,
          purchases: 1000,
          revenue: 100000,
          conversionRate: 0.1,
        },
        {
          storeId: 's2',
          views: 8000,
          purchases: 800,
          revenue: 80000,
          conversionRate: 0.1,
        },
      ]);
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should order by views when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('views', { limit: 5 });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('SUM(s.views)', 'DESC');
    });

    it('should order by purchases when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('purchases', { limit: 5 });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'SUM(s.purchases)',
        'DESC'
      );
    });

    it('should order by conversion rate when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('conversionRate', { limit: 5 });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'conversionRate',
        'DESC'
      );
    });

    it('should use default limit of 10', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('revenue');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should apply date range filters', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('revenue', {
        from: '2025-01-01',
        to: '2025-12-31',
        limit: 10,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle zero conversion rate', async () => {
      const rawResults = [
        {
          storeId: 's1',
          views: '0',
          purchases: '0',
          revenue: '0',
          conversionRate: '0',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopStores('revenue');

      expect(result[0].conversionRate).toBe(0);
    });
  });

  describe('legacy methods', () => {
    it('getAggregateRange should call getAggregatedMetrics', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});
      jest.spyOn(repo, 'getAggregatedMetrics');

      await repo.getAggregateRange('s1', '2025-01-01', '2025-12-31');

      expect(repo.getAggregatedMetrics).toHaveBeenCalledWith('s1', {
        from: '2025-01-01',
        to: '2025-12-31',
      });
    });
  });
});
