import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from '../../utils/helpers';
import { AiLogsRepository } from 'src/modules/ai/ai-logs/ai-logs.repository';

describe('AiLogsRepository', () => {
  let repo: AiLogsRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<AiLog>>>;

  const mockLog: AiLog = {
    id: 'l1',
    feature: 'description_generator',
    details: { success: true },
    createdAt: new Date('2025-01-15'),
    user: { id: 'u1' } as any,
    store: { id: 's1' } as any,
  } as unknown as AiLog;

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
      execute: jest.fn(),
    } as any;

    manager = createMockEntityManager();
    manager.createQueryBuilder!.mockReturnValue(queryBuilder as any);

    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(manager as any);

    repo = new AiLogsRepository(dataSource as any);

    jest.clearAllMocks();
  });

  describe('findByFilter', () => {
    it('should find logs with all filters', async () => {
      const logs = [mockLog];
      queryBuilder.getMany!.mockResolvedValue(logs);

      const result = await repo.findByFilter(
        {
          storeId: 's1',
          userId: 'u1',
          feature: 'description_generator',
          dateFrom: new Date('2025-01-01'),
          dateTo: new Date('2025-01-31'),
          hasDetails: true,
        },
        { limit: 10, offset: 0 }
      );

      expect(result).toEqual(logs);
      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should filter by hasDetails', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.findByFilter({ hasDetails: true });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'l.details IS NOT NULL'
      );

      jest.clearAllMocks();
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.findByFilter({ hasDetails: false });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('l.details IS NULL');
    });
  });

  describe('getUsageStats', () => {
    it('should calculate comprehensive usage statistics', async () => {
      const logs = [
        {
          ...mockLog,
          feature: 'description_generator',
          details: { test: 'data' },
          user: { id: 'u1' },
          store: { id: 's1' },
          createdAt: new Date('2025-01-15'),
        },
        {
          ...mockLog,
          id: 'l2',
          feature: 'title_generator',
          details: { test: 'data2' },
          user: { id: 'u2' },
          store: { id: 's2' },
          createdAt: new Date('2025-01-16'),
        },
      ] as unknown as AiLog[];

      queryBuilder.getMany!.mockResolvedValue(logs);

      const stats = await repo.getUsageStats({ storeId: 's1' });

      expect(stats.totalLogs).toBe(2);
      expect(stats.byFeature).toHaveProperty('description_generator', 1);
      expect(stats.byFeature).toHaveProperty('title_generator', 1);
      expect(stats.topFeatures).toHaveLength(2);
      expect(stats.dailyUsage).toBeDefined();
    });
  });

  describe('getTopFeatures', () => {
    it('should return top features by usage', async () => {
      const rawResults = [
        // eslint-disable-next-line camelcase
        { l_feature: 'description_generator', count: '100' },
        // eslint-disable-next-line camelcase
        { l_feature: 'title_generator', count: '50' },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawResults);

      const result = await repo.getTopFeatures(10, { storeId: 's1' });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        feature: 'description_generator',
        count: 100,
        percentage: expect.any(Number),
      });
    });

    it('should handle empty results', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      const result = await repo.getTopFeatures();

      expect(result).toEqual([]);
    });
  });

  describe('getDailyUsage', () => {
    it('should return daily usage metrics', async () => {
      const dailyData = [
        {
          date: '2025-01-15',
          count: '10',
          uniqueUsers: '5',
          uniqueStores: '3',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(dailyData);

      // Mock getTopFeaturesByDate
      jest
        .spyOn(repo as any, 'getTopFeaturesByDate')
        .mockResolvedValue(['description_generator', 'title_generator']);

      const result = await repo.getDailyUsage(30, { storeId: 's1' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2025-01-15',
        count: 10,
        uniqueUsers: 5,
        uniqueStores: 3,
        topFeatures: expect.any(Array),
      });
    });

    it('should apply filters', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      jest.spyOn(repo as any, 'getTopFeaturesByDate').mockResolvedValue([]);

      await repo.getDailyUsage(7, {
        storeId: 's1',
        userId: 'u1',
        feature: 'test',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getErrorLogs', () => {
    it('should get logs with errors', async () => {
      const errorLogs = [{ ...mockLog, details: { error: 'Test error' } }];
      queryBuilder.getMany!.mockResolvedValue(errorLogs as any);

      const result = await repo.getErrorLogs(100, { storeId: 's1' });

      expect(result).toEqual(errorLogs);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        `l.details->>'error' IS NOT NULL`
      );
    });

    it('should apply limit', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getErrorLogs(50);

      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should cleanup old logs', async () => {
      queryBuilder.execute!.mockResolvedValue({ affected: 100 });

      const result = await repo.cleanupOldLogs(30);

      expect(result).toBe(100);
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'createdAt < :cutoffDate',
        expect.any(Object)
      );
    });

    it('should handle no affected rows', async () => {
      queryBuilder.execute!.mockResolvedValue({ affected: 0 });

      const result = await repo.cleanupOldLogs(90);

      expect(result).toBe(0);
    });
  });
});
