import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { ProductDailyStats } from 'src/entities/infrastructure/analytics/product-daily-stats.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from 'test/unit/helpers';

describe('ProductDailyStatsRepository', () => {
  let repo: ProductDailyStatsRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<
    MockedMethods<SelectQueryBuilder<ProductDailyStats>>
  >;

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
      clone: jest.fn().mockReturnThis(),
    } as any;

    manager = createMockEntityManager();
    manager.createQueryBuilder!.mockReturnValue(queryBuilder as any);

    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    repo = new ProductDailyStatsRepository(dataSource as any);

    jest.clearAllMocks();
  });

  describe('getAggregatedMetrics', () => {
    it('should return aggregated metrics for product', async () => {
      const rawResult = {
        views: '1000',
        purchases: '100',
        addToCarts: '250',
        revenue: '10000.00',
      };

      queryBuilder.getRawOne!.mockResolvedValue(rawResult);

      const result = await repo.getAggregatedMetrics('p1');

      expect(result).toEqual({
        views: 1000,
        purchases: 100,
        addToCarts: 250,
        revenue: 10000,
      });
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'p.productId = :productId',
        {
          productId: 'p1',
        }
      );
    });

    it('should apply date range filters', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('p1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle null values', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({
        views: null,
        purchases: null,
        addToCarts: null,
        revenue: null,
      });

      const result = await repo.getAggregatedMetrics('p1');

      expect(result.views).toBe(0);
      expect(result.purchases).toBe(0);
      expect(result.addToCarts).toBe(0);
      expect(result.revenue).toBe(0);
    });

    it('should use COALESCE to handle nulls', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('p1');

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
          productId: 'p1',
          date: '2025-01-01',
          views: 100,
          purchases: 10,
        } as ProductDailyStats,
        {
          id: '2',
          productId: 'p1',
          date: '2025-01-02',
          views: 120,
          purchases: 12,
        } as ProductDailyStats,
      ];

      queryBuilder.getMany!.mockResolvedValue(stats);

      const result = await repo.getDailyTimeseries('p1');

      expect(result).toEqual(stats);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'p.productId = :productId',
        {
          productId: 'p1',
        }
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.date', 'ASC');
    });

    it('should apply date range filters', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getDailyTimeseries('p1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should return empty array when no data', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await repo.getDailyTimeseries('p1');

      expect(result).toEqual([]);
    });

    it('should order by date ascending', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getDailyTimeseries('p1');

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.date', 'ASC');
    });
  });

  describe('getComparativeMetrics', () => {
    it('should return comparative metrics for multiple products', async () => {
      const rawResults = [
        {
          productId: 'p1',
          views: '500',
          purchases: '50',
          addToCarts: '100',
          revenue: '5000.00',
        },
        {
          productId: 'p2',
          views: '600',
          purchases: '60',
          addToCarts: '120',
          revenue: '6000.00',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getComparativeMetrics(['p1', 'p2']);

      expect(result).toEqual([
        {
          productId: 'p1',
          views: 500,
          purchases: 50,
          addToCarts: 100,
          revenue: 5000,
        },
        {
          productId: 'p2',
          views: 600,
          purchases: 60,
          addToCarts: 120,
          revenue: 6000,
        },
      ]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'p.productId IN (:...productIds)',
        {
          productIds: ['p1', 'p2'],
        }
      );
    });

    it('should return empty array for empty product list', async () => {
      const result = await repo.getComparativeMetrics([]);

      expect(result).toEqual([]);
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should apply date range filters', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getComparativeMetrics(['p1', 'p2'], {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should group by productId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getComparativeMetrics(['p1', 'p2']);

      expect(queryBuilder.groupBy).toHaveBeenCalledWith('p.productId');
    });

    it('should handle single product', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([
        {
          productId: 'p1',
          views: '100',
          purchases: '10',
          addToCarts: '20',
          revenue: '1000',
        },
      ]);

      const result = await repo.getComparativeMetrics(['p1']);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p1');
    });
  });

  describe('getUnderperformingProducts', () => {
    it('should return underperforming products', async () => {
      const rawResults = [
        {
          id: 'p1',
          name: 'Product 1',
          views: '50',
          purchases: '1',
          revenue: '100.00',
        },
        {
          id: 'p2',
          name: 'Product 2',
          views: '40',
          purchases: '0',
          revenue: '0.00',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getUnderperformingProducts(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(rawResults);
      expect(queryBuilder.where).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.deletedAt IS NULL');
    });

    it('should filter by date range', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getUnderperformingProducts('s1', '2025-01-01', '2025-01-31');

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

      await repo.getUnderperformingProducts('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1); // Only deletedAt filter
    });

    it('should join with products table', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getUnderperformingProducts('s1');

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'products',
        'p',
        'p.id = stats.productId'
      );
    });
  });

  describe('legacy methods', () => {
    it('getAggregateRange should call getAggregatedMetrics', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});
      jest.spyOn(repo, 'getAggregatedMetrics');

      await repo.getAggregateRange('p1', '2025-01-01', '2025-01-31');

      expect(repo.getAggregatedMetrics).toHaveBeenCalledWith('p1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle database errors', async () => {
      queryBuilder.getRawOne!.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(repo.getAggregatedMetrics('p1')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle invalid date formats', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.getAggregatedMetrics('p1', {
        from: 'invalid-date',
        to: '2025-01-31',
      });

      // Should not throw, query builder handles it
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });
});
