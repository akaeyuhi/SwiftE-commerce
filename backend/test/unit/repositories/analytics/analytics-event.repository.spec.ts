import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AnalyticsEventRepository } from 'src/modules/analytics/repositories/analytics-event.repository';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from 'src/entities/infrastructure/analytics/analytics-event.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from 'test/utils/helpers';

describe('AnalyticsEventRepository', () => {
  let repo: AnalyticsEventRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<AnalyticsEvent>>>;

  beforeEach(() => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getCount: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    } as any;

    manager = createMockEntityManager();
    manager.createQueryBuilder!.mockReturnValue(queryBuilder as any);

    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    repo = new AnalyticsEventRepository(dataSource as any);

    jest.clearAllMocks();
  });

  describe('aggregateProductMetrics', () => {
    it('should aggregate product metrics', async () => {
      const rawResult = {
        views: '100',
        purchases: '10',
        addToCarts: '25',
        purchasesValue: '999.99',
      };

      queryBuilder.getRawOne!.mockResolvedValue(rawResult);

      const result = await repo.aggregateProductMetrics('p1');

      expect(result).toEqual({
        views: 100,
        purchases: 10,
        addToCarts: 25,
        revenue: 999.99,
      });
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'e.productId = :productId',
        {
          productId: 'p1',
        }
      );
    });

    it('should handle date range options', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.aggregateProductMetrics('p1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle null/undefined values', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      const result = await repo.aggregateProductMetrics('p1');

      expect(result).toEqual({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
      });
    });

    it('should apply only "from" date filter', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.aggregateProductMetrics('p1', { from: '2025-01-01' });

      const calls = (queryBuilder.andWhere as jest.Mock).mock.calls;
      const fromCall = calls.find(
        (call) =>
          call[0].includes('createdAt') && call[1].hasOwnProperty('from')
      );

      expect(fromCall).toBeDefined();
      expect(fromCall[1].from).toMatch(/2025-01-01/);
    });

    it('should apply only "to" date filter', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.aggregateProductMetrics('p1', { to: '2025-01-31' });

      const calls = (queryBuilder.andWhere as jest.Mock).mock.calls;
      const toCall = calls.find(
        (call) => call[0].includes('createdAt') && call[1].hasOwnProperty('to')
      );

      expect(toCall).toBeDefined();
      expect(toCall[1].to).toMatch(/2025-01-31/);
    });
  });

  describe('aggregateStoreMetrics', () => {
    it('should aggregate store metrics', async () => {
      const rawResult = {
        views: '500',
        purchases: '50',
        addToCarts: '150',
        checkouts: '60',
        purchasesValue: '5000.00',
      };

      queryBuilder.getRawOne!.mockResolvedValue(rawResult);

      const result = await repo.aggregateStoreMetrics('s1');

      expect(result).toEqual({
        views: 500,
        purchases: 50,
        addToCarts: 150,
        checkouts: 60,
        revenue: 5000,
      });
      expect(queryBuilder.where).toHaveBeenCalledWith('e.storeId = :storeId', {
        storeId: 's1',
      });
    });

    it('should apply date range filters', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});

      await repo.aggregateStoreMetrics('s1', {
        from: '2025-01-01',
        to: '2025-12-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle empty result', async () => {
      queryBuilder.getRawOne!.mockResolvedValue(null);

      const result = await repo.aggregateStoreMetrics('s1');

      expect(result).toEqual({
        views: 0,
        purchases: 0,
        addToCarts: 0,
        checkouts: 0,
        revenue: 0,
      });
    });
  });

  describe('getTopProductsByConversion', () => {
    it('should return top products by conversion rate', async () => {
      const rawResults = [
        {
          productId: 'p1',
          views: '100',
          purchases: '20',
          revenue: '2000.00',
        },
        {
          productId: 'p2',
          views: '200',
          purchases: '30',
          revenue: '3000.00',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopProductsByConversion('s1', { limit: 10 });

      expect(result).toEqual([
        {
          productId: 'p1',
          views: 100,
          purchases: 20,
          revenue: 2000,
          conversionRate: 0.2,
        },
        {
          productId: 'p2',
          views: 200,
          purchases: 30,
          revenue: 3000,
          conversionRate: 0.15,
        },
      ]);
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should handle zero views for conversion rate', async () => {
      const rawResults = [
        {
          productId: 'p1',
          views: '0',
          purchases: '0',
          revenue: '0',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopProductsByConversion('s1');

      expect(result[0].conversionRate).toBe(0);
    });

    it('should apply custom limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopProductsByConversion('s1', { limit: 5 });

      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should use default limit of 10', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopProductsByConversion('s1');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should filter by date range', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopProductsByConversion('s1', {
        from: '2025-01-01',
        to: '2025-01-31',
        limit: 10,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter out products with no views', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getTopProductsByConversion('s1');

      expect(queryBuilder.having).toHaveBeenCalledWith(
        expect.stringContaining('> 0')
      );
    });
  });

  describe('getDailyEventCounts', () => {
    it('should return daily event counts', async () => {
      const rawResults = [
        {
          date: '2025-01-01',
          eventType: AnalyticsEventType.VIEW,
          count: '50',
        },
        {
          date: '2025-01-01',
          eventType: AnalyticsEventType.PURCHASE,
          count: '5',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getDailyEventCounts({ storeId: 's1' });

      expect(result).toEqual([
        {
          date: '2025-01-01',
          eventType: AnalyticsEventType.VIEW,
          count: 50,
        },
        {
          date: '2025-01-01',
          eventType: AnalyticsEventType.PURCHASE,
          count: 5,
        },
      ]);
    });

    it('should filter by storeId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getDailyEventCounts({ storeId: 's1' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'e.storeId = :storeId',
        {
          storeId: 's1',
        }
      );
    });

    it('should filter by productId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getDailyEventCounts({ productId: 'p1' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'e.productId = :productId',
        {
          productId: 'p1',
        }
      );
    });

    it('should filter by event types', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getDailyEventCounts({
        eventTypes: [AnalyticsEventType.VIEW, AnalyticsEventType.PURCHASE],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'e.eventType IN (:...eventTypes)',
        {
          eventTypes: [AnalyticsEventType.VIEW, AnalyticsEventType.PURCHASE],
        }
      );
    });

    it('should handle all filters together', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getDailyEventCounts({
        storeId: 's1',
        productId: 'p1',
        eventTypes: [AnalyticsEventType.VIEW],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should apply date range', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getDailyEventCounts(
        { storeId: 's1' },
        { from: '2025-01-01', to: '2025-01-31' }
      );

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getRevenueTrends', () => {
    it('should return revenue trends', async () => {
      const rawResults = [
        { date: '2025-01-01', revenue: '1000.00', transactions: '10' },
        { date: '2025-01-02', revenue: '1500.00', transactions: '15' },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getRevenueTrends(
        's1',
        '2025-01-01',
        '2025-01-02'
      );

      expect(result).toEqual([
        { date: '2025-01-01', revenue: 1000, transactions: 10 },
        { date: '2025-01-02', revenue: 1500, transactions: 15 },
      ]);
    });

    it('should filter by storeId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getRevenueTrends('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.storeId = :storeId',
        {
          storeId: 's1',
        }
      );
    });

    it('should work without filters', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getRevenueTrends();

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'event.eventType = :type',
        {
          type: 'purchase',
        }
      );
    });
  });

  describe('getFunnelData', () => {
    it('should return funnel data', async () => {
      queryBuilder.getCount!.mockResolvedValueOnce(1000);
      queryBuilder.getCount!.mockResolvedValueOnce(500);
      queryBuilder.getCount!.mockResolvedValueOnce(100);
      queryBuilder.clone!.mockReturnValue(queryBuilder as any);

      const result = await repo.getFunnelData(
        's1',
        'p1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual([1000, 500, 100]);
      expect(queryBuilder.getCount).toHaveBeenCalledTimes(3);
    });

    it('should handle optional filters', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.clone!.mockReturnValue(queryBuilder as any);

      await repo.getFunnelData();

      expect(queryBuilder.getCount).toHaveBeenCalledTimes(3);
    });
  });

  describe('getEventsForUserJourney', () => {
    it('should return user journey events', async () => {
      const events = [
        {
          userId: 'u1',
          eventType: AnalyticsEventType.VIEW,
          productId: 'p1',
          timestamp: new Date('2025-01-01'),
        },
        {
          userId: 'u1',
          eventType: AnalyticsEventType.PURCHASE,
          productId: 'p1',
          timestamp: new Date('2025-01-02'),
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(events);

      const result = await repo.getEventsForUserJourney(
        's1',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result).toEqual(events);
      expect(queryBuilder.limit).toHaveBeenCalledWith(10000);
    });

    it('should filter null userIds', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.getEventsForUserJourney();

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'event.userId IS NOT NULL'
      );
    });
  });

  describe('bulkInsert', () => {
    it('should insert events in batches', async () => {
      const events = Array.from({ length: 2500 }, () => ({
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
      }));

      queryBuilder.execute!.mockResolvedValue({ affected: 1000 } as any);

      await repo.bulkInsert(events);

      // Should be called 3 times (1000, 1000, 500)
      expect(queryBuilder.execute).toHaveBeenCalledTimes(3);
      expect(manager.createQueryBuilder).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      await repo.bulkInsert([]);

      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should handle undefined input', async () => {
      await repo.bulkInsert(undefined as any);

      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should insert single batch for small arrays', async () => {
      const events = Array.from({ length: 10 }, () => ({
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
      }));

      queryBuilder.execute!.mockResolvedValue({ affected: 10 } as any);

      await repo.bulkInsert(events);

      expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
    });

    it('should use orIgnore for duplicate handling', async () => {
      const events = [{ storeId: 's1', eventType: AnalyticsEventType.VIEW }];

      queryBuilder.execute!.mockResolvedValue({ affected: 1 } as any);

      await repo.bulkInsert(events);

      expect((queryBuilder as any).orIgnore).toHaveBeenCalled();
    });
  });

  describe('legacy methods', () => {
    it('aggregateProductRange should call aggregateProductMetrics', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});
      jest.spyOn(repo, 'aggregateProductMetrics');

      await repo.aggregateProductRange('p1', '2025-01-01', '2025-01-31');

      expect(repo.aggregateProductMetrics).toHaveBeenCalledWith('p1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });
    });

    it('aggregateStoreRange should call aggregateStoreMetrics', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({});
      jest.spyOn(repo, 'aggregateStoreMetrics');

      await repo.aggregateStoreRange('s1', '2025-01-01', '2025-01-31');

      expect(repo.aggregateStoreMetrics).toHaveBeenCalledWith('s1', {
        from: '2025-01-01',
        to: '2025-01-31',
      });
    });

    it('topProductsByConversion should call getTopProductsByConversion', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      jest.spyOn(repo, 'getTopProductsByConversion');

      await repo.topProductsByConversion('s1', '2025-01-01', '2025-01-31', 5);

      expect(repo.getTopProductsByConversion).toHaveBeenCalledWith('s1', {
        from: '2025-01-01',
        to: '2025-01-31',
        limit: 5,
      });
    });

    it('insertMany should call bulkInsert', async () => {
      const events = [{ storeId: 's1', eventType: AnalyticsEventType.VIEW }];
      queryBuilder.execute!.mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(repo, 'bulkInsert');

      await repo.insertMany(events);

      expect(repo.bulkInsert).toHaveBeenCalledWith(events);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors gracefully', async () => {
      queryBuilder.getRawOne!.mockRejectedValue(new Error('Database error'));

      await expect(repo.aggregateProductMetrics('p1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle malformed data', async () => {
      queryBuilder.getRawOne!.mockResolvedValue({
        views: 'invalid',
        purchases: null,
      });

      const result = await repo.aggregateProductMetrics('p1');

      expect(result.views).toBe(0); // NaN should be handled as 0
      expect(result.purchases).toBe(0);
    });
  });
});
