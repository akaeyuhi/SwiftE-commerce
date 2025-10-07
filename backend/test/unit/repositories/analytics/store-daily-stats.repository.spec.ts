import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { StoreDailyStats } from 'src/entities/infrastructure/analytics/store-daily-stats.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from 'test/utils/helpers';

describe('StoreDailyStatsRepository', () => {
  let repo: StoreDailyStatsRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<StoreDailyStats>>>;

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
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
      queryBuilder.getRawOne!.mockResolvedValue({
        views: null,
        purchases: null,
        addToCarts: null,
        revenue: null,
        checkouts: null,
      });

      const result = await repo.getAggregatedMetrics('s1');

      expect(result.views).toBe(0);
      expect(result.purchases).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.checkouts).toBe(0);
    });

    it('should handle empty result', async () => {
      queryBuilder.getRawOne!.mockResolvedValue(null);

      const result = await repo.getAggregatedMetrics('s1');

      expect(result).toEqual({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
        checkouts: 0,
      });
    });

    it('should apply only "from" date', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('s1', { from: '2025-01-01' });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should apply only "to" date', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('s1', { to: '2025-12-31' });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should use COALESCE in SELECT statements', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('s1');

      expect(queryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('COALESCE')])
      );
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
          addToCarts: 120,
          revenue: 5000,
          checkouts: 60,
        } as StoreDailyStats,
        {
          id: '2',
          storeId: 's1',
          date: '2025-01-02',
          views: 600,
          purchases: 60,
          addToCarts: 150,
          revenue: 6000,
          checkouts: 70,
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

    it('should return empty array when no data', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await repo.getDailyTimeseries('s1');

      expect(result).toEqual([]);
    });

    it('should order by date ascending', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getDailyTimeseries('s1');

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('s.date', 'ASC');
    });

    it('should handle single day data', async () => {
      const singleDayStat = [
        {
          id: '1',
          storeId: 's1',
          date: '2025-01-01',
          views: 100,
          purchases: 10,
        } as StoreDailyStats,
      ];

      queryBuilder.getMany!.mockResolvedValue(singleDayStat);

      const result = await repo.getDailyTimeseries('s1');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-01-01');
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

    it('should group by storeId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('revenue');

      expect(queryBuilder.groupBy).toHaveBeenCalledWith('s.storeId');
    });

    it('should calculate conversion rate correctly', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('revenue');

      expect(queryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('CASE WHEN SUM(s.views) > 0'),
        ])
      );
    });

    it('should handle custom limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('revenue', { limit: 25 });

      expect(queryBuilder.limit).toHaveBeenCalledWith(25);
    });

    it('should default to revenue metric', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores();

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'SUM(s.revenue)',
        'DESC'
      );
    });
  });

  describe('getTopStoreDaily', () => {
    it('should return top stores by daily metrics', async () => {
      const rawResults = [
        {
          storeId: 's1',
          totalViews: '15000',
          totalPurchases: '1500',
          totalRevenue: '150000.00',
          totalAddToCarts: '3000',
        },
        {
          storeId: 's2',
          totalViews: '12000',
          totalPurchases: '1200',
          totalRevenue: '120000.00',
          totalAddToCarts: '2500',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopStoreDaily(
        '2025-01-01',
        '2025-01-31',
        10
      );

      expect(result).toEqual(rawResults);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'stats.date BETWEEN :from AND :to',
        {
          from: '2025-01-01',
          to: '2025-01-31',
        }
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('totalRevenue', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should handle only "from" date', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStoreDaily('2025-01-01', undefined as any, 10);

      expect(queryBuilder.where).toHaveBeenCalledWith('stats.date >= :from', {
        from: '2025-01-01',
      });
    });

    it('should handle only "to" date', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStoreDaily(undefined as any, '2025-01-31', 10);

      expect(queryBuilder.where).toHaveBeenCalledWith('stats.date <= :to', {
        to: '2025-01-31',
      });
    });

    it('should use default limit of 10', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStoreDaily('2025-01-01', '2025-01-31');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should group by storeId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStoreDaily('2025-01-01', '2025-01-31');

      expect(queryBuilder.groupBy).toHaveBeenCalledWith('stats.storeId');
    });

    it('should aggregate all metrics', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStoreDaily('2025-01-01', '2025-01-31');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.views)',
        'totalViews'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.purchases)',
        'totalPurchases'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.revenue)',
        'totalRevenue'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.addToCarts)',
        'totalAddToCarts'
      );
    });
  });

  describe('getUnderperformingStores', () => {
    it('should return underperforming stores', async () => {
      const rawResults = [
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
          views: '80',
          purchases: '1',
          revenue: '100.00',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getUnderperformingStores(
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(rawResults);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'stats.date BETWEEN :from AND :to',
        {
          from: '2025-01-01',
          to: '2025-01-31',
        }
      );
    });

    it('should work without date range', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getUnderperformingStores();

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should join with stores table', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getUnderperformingStores();

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'stores',
        's',
        's.id = stats.storeId'
      );
    });

    it('should group by storeId and name', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getUnderperformingStores();

      expect(queryBuilder.groupBy).toHaveBeenCalledWith('stats.storeId');
      expect(queryBuilder.addGroupBy).toHaveBeenCalledWith('s.name');
    });

    it('should aggregate metrics', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getUnderperformingStores();

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.views)',
        'views'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.purchases)',
        'purchases'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'SUM(stats.revenue)',
        'revenue'
      );
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

  describe('edge cases', () => {
    it('should handle database errors', async () => {
      queryBuilder.getRawOne!.mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(repo.getAggregatedMetrics('s1')).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('should handle empty results for top stores', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      const result = await repo.getTopStores('revenue');

      expect(result).toEqual([]);
    });

    it('should handle NaN values in conversion rate', async () => {
      const rawResults = [
        {
          storeId: 's1',
          views: 'invalid',
          purchases: '100',
          revenue: '1000',
          conversionRate: 'NaN',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopStores('revenue');

      expect(result[0].views).toBe(0); // Should handle invalid numbers
    });

    it('should handle missing storeId gracefully', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('');

      expect(queryBuilder.where).toHaveBeenCalledWith('s.storeId = :storeId', {
        storeId: '',
      });
    });

    it('should handle very large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        storeId: 's1',
        date: '2025-01-01',
        views: 100,
        purchases: 10,
      })) as StoreDailyStats[];

      queryBuilder.getMany!.mockResolvedValue(largeDataset);

      const result = await repo.getDailyTimeseries('s1');

      expect(result).toHaveLength(1000);
    });
  });

  describe('performance', () => {
    it('should use efficient aggregation with GROUP BY', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStores('revenue');

      expect(queryBuilder.groupBy).toHaveBeenCalled();
    });

    it('should limit results for performance', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopStoreDaily('2025-01-01', '2025-01-31', 100);

      expect(queryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });
});
