import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AiAudit } from 'src/entities/ai/ai-audit.entity';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from '../../../utils/helpers';
import { AiAuditRepository } from 'src/modules/ai/ai-audit/ai-audit.repository';

describe('AiAuditRepository', () => {
  let repo: AiAuditRepository;
  let manager: Partial<MockedMethods<EntityManager>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<AiAudit>>>;

  const mockAudit: AiAudit = {
    id: 'a1',
    feature: 'description_generator',
    provider: 'openai',
    model: 'gpt-4',
    encryptedResponse: {
      ciphertext: 'encrypted',
      iv: 'iv123',
      tag: 'tag123',
    },
    createdAt: new Date('2025-01-15'),
    user: { id: 'u1' } as any,
    store: { id: 's1' } as any,
  } as unknown as AiAudit;

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
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

    repo = new AiAuditRepository(dataSource as any);

    jest.clearAllMocks();
  });

  describe('findByFilter', () => {
    it('should find audits with all filters', async () => {
      const audits = [mockAudit];
      queryBuilder.getMany!.mockResolvedValue(audits);

      const result = await repo.findByFilter(
        {
          storeId: 's1',
          userId: 'u1',
          feature: 'description_generator',
          provider: 'openai',
          model: 'gpt-4',
          dateFrom: new Date('2025-01-01'),
          dateTo: new Date('2025-01-31'),
        },
        { limit: 10, offset: 0 }
      );

      expect(result).toEqual(audits);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('s.id = :storeId', {
        storeId: 's1',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('u.id = :userId', {
        userId: 'u1',
      });
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
      expect(queryBuilder.offset).toHaveBeenCalledWith(0);
    });

    it('should work without optional filters', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.findByFilter({});

      expect(queryBuilder.limit).not.toHaveBeenCalled();
      expect(queryBuilder.offset).not.toHaveBeenCalled();
    });
  });

  describe('getAuditStats', () => {
    it('should calculate comprehensive audit statistics', async () => {
      const audits = [
        {
          ...mockAudit,
          feature: 'description_generator',
          provider: 'openai',
          encryptedResponse: { ciphertext: 'enc', iv: 'iv', tag: 'tag' },
          user: { id: 'u1' },
          store: { id: 's1' },
          createdAt: new Date('2025-01-15'),
        },
        {
          ...mockAudit,
          id: 'a2',
          feature: 'title_generator',
          provider: 'anthropic',
          encryptedResponse: { ciphertext: 'enc2', iv: 'iv2', tag: 'tag2' },
          user: { id: 'u2' },
          store: { id: 's2' },
          createdAt: new Date('2025-01-16'),
        },
      ] as unknown as AiAudit[];

      queryBuilder.getMany!.mockResolvedValue(audits);

      const stats = await repo.getAuditStats({ storeId: 's1' });

      expect(stats.totalAudits).toBe(2);
      expect(stats.byFeature).toHaveProperty('description_generator', 1);
      expect(stats.byFeature).toHaveProperty('title_generator', 1);
      expect(stats.byProvider).toHaveProperty('openai', 1);
      expect(stats.byProvider).toHaveProperty('anthropic', 1);
      expect(stats.encryptionHealth.healthPercentage).toBe(100);
    });

    it('should handle corrupted encryption', async () => {
      const audits = [
        {
          ...mockAudit,
          encryptedResponse: { ciphertext: 'enc' }, // Missing iv and tag
        },
      ] as AiAudit[];

      queryBuilder.getMany!.mockResolvedValue(audits);

      const stats = await repo.getAuditStats();

      expect(stats.encryptionHealth.corruptedEntries).toBe(1);
      expect(stats.encryptionHealth.healthPercentage).toBe(0);
    });
  });

  describe('getByProvider', () => {
    it('should get audits by provider', async () => {
      const audits = [mockAudit];
      queryBuilder.getMany!.mockResolvedValue(audits);

      const result = await repo.getByProvider('openai', {
        storeId: 's1',
        limit: 10,
      });

      expect(result).toEqual(audits);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'a.provider = :provider',
        { provider: 'openai' }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('s.id = :storeId', {
        storeId: 's1',
      });
    });

    it('should apply date filters', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getByProvider('openai', {
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'a.createdAt >= :dateFrom',
        expect.any(Object)
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'a.createdAt <= :dateTo',
        expect.any(Object)
      );
    });
  });

  describe('getRecentAudits', () => {
    it('should get recent audits within timeframe', async () => {
      const audits = [mockAudit];
      queryBuilder.getMany!.mockResolvedValue(audits);

      const result = await repo.getRecentAudits(60, 100);

      expect(result).toEqual(audits);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'a.createdAt >= :cutoffTime',
        expect.any(Object)
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('should use default parameters', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getRecentAudits();

      expect(queryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('getSuspiciousAudits', () => {
    it('should find audits with unusual volume', async () => {
      queryBuilder.getMany!.mockResolvedValue([mockAudit]);

      const result = await repo.getSuspiciousAudits({ unusualVolume: true });

      expect(result).toEqual([mockAudit]);
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter unusual providers', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.getSuspiciousAudits({ unusualProviders: true, limit: 50 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'a.provider NOT IN (:...commonProviders)',
        expect.any(Object)
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('validateEncryptionIntegrity', () => {
    it('should validate encryption integrity', async () => {
      const audits = [
        {
          ...mockAudit,
          encryptedResponse: { ciphertext: 'enc', iv: 'iv', tag: 'tag' },
        },
        {
          ...mockAudit,
          id: 'a2',
          encryptedResponse: { ciphertext: 'enc2' }, // Missing fields
        },
      ] as AiAudit[];

      queryBuilder.getMany!.mockResolvedValue(audits);

      const result = await repo.validateEncryptionIntegrity(100);

      expect(result.totalChecked).toBe(2);
      expect(result.validEntries).toBe(1);
      expect(result.corruptedEntries).toBe(1);
      expect(result.healthPercentage).toBe(50);
    });

    it('should handle empty results', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await repo.validateEncryptionIntegrity(10);

      expect(result.totalChecked).toBe(0);
      expect(result.healthPercentage).toBe(0);
    });
  });

  describe('cleanupOldAudits', () => {
    it('should cleanup old audits while preserving recent ones', async () => {
      // eslint-disable-next-line camelcase
      const preserveIds = [{ a_id: 'a1' }, { a_id: 'a2' }];
      queryBuilder.getRawMany!.mockResolvedValue(preserveIds);
      queryBuilder.execute!.mockResolvedValue({ affected: 10 });

      const result = await repo.cleanupOldAudits(90, 1000);

      expect(result.deletedCount).toBe(10);
      expect(result.preservedCount).toBe(2);
      expect(queryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle no preserved entries', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.execute!.mockResolvedValue({ affected: 5 });

      const result = await repo.cleanupOldAudits(30, 100);

      expect(result.deletedCount).toBe(5);
      expect(result.preservedCount).toBe(0);
    });
  });
});
