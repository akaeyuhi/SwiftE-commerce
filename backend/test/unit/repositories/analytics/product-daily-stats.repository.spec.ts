import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { ProductDailyStats } from 'src/entities/infrastructure/analytics/product-daily-stats.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from '../../../utils/helpers';

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
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
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
        { productIds: ['p1', 'p2'] }
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
});
