import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  AiLogsService,
  RecordAiLogParams,
} from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiLogsRepository } from 'src/modules/ai/ai-logs/ai-logs.repository';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { createRepositoryMock, MockedMethods } from 'test/utils/helpers';

describe('AiLogsService', () => {
  let service: AiLogsService;
  let logRepo: Partial<MockedMethods<AiLogsRepository>>;

  const mockLog: AiLog = {
    id: 'log1',
    feature: 'description_generator',
    details: { success: true },
    user: { id: 'u1' } as any,
    store: { id: 's1' } as any,
    createdAt: new Date(),
  } as unknown as AiLog;

  beforeEach(async () => {
    logRepo = createRepositoryMock<AiLogsRepository>([
      'createEntity',
      'findByFilter',
      'getUsageStats',
      'getTopFeatures',
      'getDailyUsage',
      'getErrorLogs',
      'cleanupOldLogs',
      'createQueryBuilder',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiLogsService,
        { provide: AiLogsRepository, useValue: logRepo },
      ],
    }).compile();

    service = module.get<AiLogsService>(AiLogsService);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    jest.clearAllMocks();
  });

  describe('record', () => {
    it('should record log successfully', async () => {
      const params: RecordAiLogParams = {
        userId: 'u1',
        storeId: 's1',
        feature: 'description_generator',
        prompt: 'Test prompt',
        details: { test: true },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      const result = await service.record(params);

      expect(result).toEqual(mockLog);
      expect(logRepo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          feature: 'description_generator',
          user: { id: 'u1' },
          store: { id: 's1' },
          details: expect.objectContaining({
            test: true,
            prompt: 'Test prompt',
            recordedAt: expect.any(String),
            serviceVersion: expect.any(String),
          }),
        })
      );
    });

    it('should sanitize sensitive data in prompt', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Contact me at test@example.com or call 123-456-7890',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).toContain('[REDACTED]');
      expect(callArg.details.prompt).not.toContain('test@example.com');
      expect(callArg.details.prompt).not.toContain('123-456-7890');
    });

    it('should sanitize sensitive keys in details', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: {
          password: 'secret123',
          apiKey: 'sk-123456',
          normalData: 'keep this',
        },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.password).toBe('[REDACTED]');
      expect(callArg.details.apiKey).toBe('[REDACTED]');
      expect(callArg.details.normalData).toBe('keep this');
    });

    it('should truncate long prompts', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'a'.repeat(1500),
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt.length).toBeLessThanOrEqual(1000);
      expect(callArg.details.prompt).toContain('...');
    });

    it('should enforce rate limiting', async () => {
      const params: RecordAiLogParams = {
        userId: 'u1',
        feature: 'test',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      // Record 100 logs (should succeed)
      for (let i = 0; i < 100; i++) {
        await service.record(params);
      }

      // 101st should fail
      await expect(service.record(params)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should handle missing userId and storeId', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.user).toBeUndefined();
      expect(callArg.store).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
      };

      logRepo.createEntity!.mockRejectedValue(new Error('DB error'));

      await expect(service.record(params)).rejects.toThrow('DB error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('recordBatch', () => {
    it('should record multiple logs', async () => {
      const logs: RecordAiLogParams[] = [
        { feature: 'test1', userId: 'u1' },
        { feature: 'test2', userId: 'u2' },
        { feature: 'test3', userId: 'u3' },
      ];

      logRepo.createEntity!.mockResolvedValue(mockLog);

      const results = await service.recordBatch(logs);

      expect(results).toHaveLength(3);
      expect(logRepo.createEntity).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      const logs: RecordAiLogParams[] = [
        { feature: 'test1' },
        { feature: 'test2' },
        { feature: 'test3' },
      ];

      logRepo
        .createEntity!.mockResolvedValueOnce(mockLog)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockLog);

      const results = await service.recordBatch(logs);

      expect(results).toHaveLength(2); // Only successful ones
    });

    it('should process in batches of 10', async () => {
      const logs: RecordAiLogParams[] = Array.from({ length: 25 }, (_, i) => ({
        feature: `test${i}`,
      }));

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.recordBatch(logs);

      expect(logRepo.createEntity).toHaveBeenCalledTimes(25);
    });
  });

  describe('findByFilter', () => {
    it('should find logs by filter', async () => {
      const filter = {
        storeId: 's1',
        feature: 'description_generator',
      };

      const logs = [mockLog];
      logRepo.findByFilter!.mockResolvedValue(logs);

      const result = await service.findByFilter(filter);

      expect(result).toEqual(logs);
      expect(logRepo.findByFilter).toHaveBeenCalledWith(filter, {});
    });

    it('should pass options to repository', async () => {
      const filter = { userId: 'u1' };
      const options = { limit: 50, offset: 10 };

      logRepo.findByFilter!.mockResolvedValue([]);

      await service.findByFilter(filter, options);

      expect(logRepo.findByFilter).toHaveBeenCalledWith(filter, options);
    });
  });

  describe('getUsageStats', () => {
    it('should get usage statistics', async () => {
      const stats = {
        totalLogs: 100,
        // eslint-disable-next-line camelcase
        byFeature: { test_feature: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
        dailyUsage: [],
        topFeatures: [],
        averageDetailsSize: 500,
      };

      logRepo.getUsageStats!.mockResolvedValue(stats);

      const result = await service.getUsageStats({ storeId: 's1' });

      expect(result).toEqual(stats);
      expect(logRepo.getUsageStats).toHaveBeenCalledWith({ storeId: 's1' });
    });
  });

  describe('getTopFeatures', () => {
    it('should get top features', async () => {
      const topFeatures = [
        { feature: 'description_generator', count: 50, percentage: 50 },
        { feature: 'title_generator', count: 30, percentage: 30 },
      ];

      logRepo.getTopFeatures!.mockResolvedValue(topFeatures);

      const result = await service.getTopFeatures(10, { storeId: 's1' });

      expect(result).toEqual(topFeatures);
      expect(logRepo.getTopFeatures).toHaveBeenCalledWith(10, {
        storeId: 's1',
      });
    });

    it('should use default limit', async () => {
      logRepo.getTopFeatures!.mockResolvedValue([]);

      await service.getTopFeatures();

      expect(logRepo.getTopFeatures).toHaveBeenCalledWith(10, {});
    });
  });

  describe('getDailyUsage', () => {
    it('should get daily usage', async () => {
      const dailyUsage = [
        { date: '2025-01-15', count: 50, uniqueUsers: 10 },
      ] as any;

      logRepo.getDailyUsage!.mockResolvedValue(dailyUsage);

      const result = await service.getDailyUsage(30, { storeId: 's1' });

      expect(result).toEqual(dailyUsage);
      expect(logRepo.getDailyUsage).toHaveBeenCalledWith(30, { storeId: 's1' });
    });
  });

  describe('getErrorLogs', () => {
    it('should get error logs', async () => {
      const errorLogs = [{ ...mockLog, details: { error: 'Test error' } }];

      logRepo.getErrorLogs!.mockResolvedValue(errorLogs as any);

      const result = await service.getErrorLogs(100, { storeId: 's1' });

      expect(result).toEqual(errorLogs);
      expect(logRepo.getErrorLogs).toHaveBeenCalledWith(100, { storeId: 's1' });
    });
  });

  describe('getUsageTrends', () => {
    it('should detect upward trend', async () => {
      const firstHalfStats = {
        totalLogs: 100,
        topFeatures: [{ feature: 'test', count: 100, percentage: 100 }],
        byFeature: { test: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      const secondHalfStats = {
        totalLogs: 150,
        topFeatures: [{ feature: 'test', count: 150, percentage: 100 }],
        byFeature: { test: 150 },
        byUser: { u1: 150 },
        byStore: { s1: 150 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      logRepo
        .getUsageStats!.mockResolvedValueOnce(firstHalfStats)
        .mockResolvedValueOnce(secondHalfStats);

      const result = await service.getUsageTrends(30, { storeId: 's1' });

      expect(result.trend).toBe('up');
      expect(result.changePercentage).toBe(50);
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should detect downward trend', async () => {
      const firstHalfStats = {
        totalLogs: 100,
        topFeatures: [],
        byFeature: { test: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      const secondHalfStats = {
        totalLogs: 50,
        topFeatures: [],
        byFeature: { test: 50 },
        byUser: { u1: 50 },
        byStore: { s1: 50 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      logRepo
        .getUsageStats!.mockResolvedValueOnce(firstHalfStats)
        .mockResolvedValueOnce(secondHalfStats);

      const result = await service.getUsageTrends(30);

      expect(result.trend).toBe('down');
      expect(result.changePercentage).toBe(-50);
      // Fix: Check if any recommendation contains the string
      expect(
        result.recommendations.some((rec) => rec.includes('decreased usage'))
      ).toBe(true);
    });

    it('should detect stable trend', async () => {
      const stats = {
        totalLogs: 100,
        topFeatures: [],
        byFeature: { test: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      logRepo
        .getUsageStats!.mockResolvedValueOnce(stats)
        .mockResolvedValueOnce(stats);

      const result = await service.getUsageTrends(30);

      expect(result.trend).toBe('stable');
      expect(result.changePercentage).toBe(0);
    });

    it('should generate insights for feature changes', async () => {
      const firstHalfStats = {
        totalLogs: 100,
        topFeatures: [{ feature: 'old_feature', count: 100, percentage: 100 }],
        byFeature: { oldFeature: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      const secondHalfStats = {
        totalLogs: 100,
        topFeatures: [{ feature: 'new_feature', count: 100, percentage: 100 }],
        byFeature: { newFeature: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
        dailyUsage: [],
        averageDetailsSize: 500,
      };

      logRepo
        .getUsageStats!.mockResolvedValueOnce(firstHalfStats)
        .mockResolvedValueOnce(secondHalfStats);

      const result = await service.getUsageTrends(30);

      // Fix: Check if any insight contains the string
      expect(
        result.insights.some((insight) =>
          insight.includes('Most popular feature changed')
        )
      ).toBe(true);
    });
  });

  describe('data sanitization', () => {
    it('should sanitize email addresses', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Email me at john.doe@example.com',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).not.toContain('john.doe@example.com');
      expect(callArg.details.prompt).toContain('[REDACTED]');
    });

    it('should sanitize credit card numbers', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Card: 4111111111111111',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).not.toContain('4111111111111111');
    });

    it('should sanitize bearer tokens', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: { auth: 'Bearer abc123token' },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(callArg.details)).not.toContain('abc123token');
    });

    it('should sanitize URLs', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Visit https://example.com/secret',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).not.toContain(
        'https://example.com/secret'
      );
    });

    it('should sanitize nested objects', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: {
          nested: {
            deep: {
              password: 'secret123',
            },
          },
        },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.nested.deep.password).toBe('[REDACTED]');
    });

    it('should sanitize arrays', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: {
          items: ['public data', 'email: test@example.com', 'more data'],
        },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      const itemsString = JSON.stringify(callArg.details.items);
      expect(itemsString).toContain('[REDACTED]');
      expect(itemsString).not.toContain('test@example.com');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old logs', async () => {
      logRepo.cleanupOldLogs!.mockResolvedValue(500);

      const result = await service.cleanup(30, false);

      expect(result.deletedCount).toBe(500);
      expect(result.errors).toEqual([]);
      expect(logRepo.cleanupOldLogs).toHaveBeenCalledWith(30);
    });

    it('should perform dry run', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(500),
      };

      logRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanup(30, true);

      expect(result.deletedCount).toBe(500);
      expect(logRepo.cleanupOldLogs).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      logRepo.cleanupOldLogs!.mockRejectedValue(new Error('Cleanup failed'));

      const result = await service.cleanup(30);

      expect(result.deletedCount).toBe(0);
      expect(result.errors).toContain('Cleanup failed');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const recentLogs = [mockLog, mockLog, mockLog];
      const errorLogs = [mockLog];

      logRepo.findByFilter!.mockResolvedValue(recentLogs);
      logRepo.getErrorLogs!.mockResolvedValue(errorLogs);

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.metrics.recentLogsCount).toBe(3);
      expect(result.metrics.errorRate).toBeCloseTo(33.33, 1);
      expect(result.metrics.averageLogSize).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status on error', async () => {
      logRepo.findByFilter!.mockRejectedValue(new Error('DB error'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.metrics.errorRate).toBe(100);
    });

    it('should calculate average log size', async () => {
      const logsWithDetails = [
        { ...mockLog, details: { data: 'a'.repeat(100) } },
        { ...mockLog, details: { data: 'b'.repeat(200) } },
      ];

      logRepo.findByFilter!.mockResolvedValue(logsWithDetails as any);
      logRepo.getErrorLogs!.mockResolvedValue([]);

      const result = await service.healthCheck();

      expect(result.metrics.averageLogSize).toBeGreaterThan(0);
    });
  });

  describe('data sanitization', () => {
    it('should sanitize email addresses', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Email me at john.doe@example.com',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).not.toContain('john.doe@example.com');
      expect(callArg.details.prompt).toContain('[REDACTED]');
    });

    it('should sanitize credit card numbers', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Card: 4111111111111111',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).not.toContain('4111111111111111');
    });

    it('should sanitize bearer tokens', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: { auth: 'Bearer abc123token' },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(callArg.details)).not.toContain('abc123token');
    });

    it('should sanitize URLs', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        prompt: 'Visit https://example.com/secret',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.prompt).not.toContain(
        'https://example.com/secret'
      );
    });

    it('should sanitize nested objects', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: {
          nested: {
            deep: {
              password: 'secret123',
            },
          },
        },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.nested.deep.password).toBe('[REDACTED]');
    });

    it('should sanitize arrays', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
        details: {
          items: ['public data', 'email: test@example.com', 'more data'],
        },
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      await service.record(params);

      const callArg = (logRepo.createEntity as jest.Mock).mock.calls[0][0];
      expect(callArg.details.items[1]).toContain('[REDACTED]');
    });
  });

  describe('rate limiting', () => {
    it('should allow logs within rate limit', async () => {
      const params: RecordAiLogParams = {
        userId: 'rate-limit-user',
        feature: 'test',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      for (let i = 0; i < 100; i++) {
        await expect(service.record(params)).resolves.toBeDefined();
      }
    });

    it('should cleanup old rate limit entries', async () => {
      const params: RecordAiLogParams = {
        feature: 'test',
      };

      logRepo.createEntity!.mockResolvedValue(mockLog);

      let mockTime = 1000000000000; // Start time

      jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

      try {
        for (let i = 0; i < 600; i++) {
          const uniqueParams = { ...params, userId: `old-user${i}` };
          await service.record(uniqueParams);
        }

        mockTime += 180000; // 3 minutes

        for (let i = 0; i < 500; i++) {
          const uniqueParams = { ...params, userId: `new-user${i}` };
          await service.record(uniqueParams);
        }

        const rateLimitMap = (service as any).logRateLimit;

        expect(rateLimitMap.size).toBeLessThan(1100);
        expect(rateLimitMap.size).toBeGreaterThan(0);
      } finally {
        jest.spyOn(Date, 'now').mockRestore();
      }
    });

    it('should use different rate limit keys for different users', async () => {
      logRepo.createEntity!.mockResolvedValue(mockLog);

      // Each user should have their own rate limit
      await service.record({ userId: 'user1', feature: 'test' });
      await service.record({ userId: 'user2', feature: 'test' });

      const rateLimitMap = (service as any).logRateLimit as Map<string, number>;
      const keys = Array.from(rateLimitMap.keys());
      expect(keys.some((k) => k.includes('user1'))).toBe(true);
      expect(keys.some((k) => k.includes('user2'))).toBe(true);
    });
  });

  describe('insights and recommendations', () => {
    it('should generate insights for usage increase', () => {
      const firstHalf = {
        totalLogs: 100,
        topFeatures: [{ feature: 'test', count: 100, percentage: 100 }],
        byFeature: { test: 100 },
        byUser: { u1: 100 },
        byStore: { s1: 100 },
      } as any;

      const secondHalf = {
        totalLogs: 120,
        topFeatures: [{ feature: 'test', count: 120, percentage: 100 }],
        byFeature: { test: 120 },
        byUser: { u1: 120 },
        byStore: { s1: 120 },
      } as any;

      const insights = (service as any).generateInsights(firstHalf, secondHalf);

      // Fix: Check if any insight contains the string
      expect(
        insights.some((insight: string) =>
          insight.includes('increased by 20 requests')
        )
      ).toBe(true);
    });

    it('should generate recommendations for upward trend', () => {
      const firstHalf = {
        totalLogs: 100,
        byFeature: { test: 100 },
        averageDetailsSize: 500,
      } as any;

      const secondHalf = {
        totalLogs: 150,
        byFeature: { test: 150 },
        averageDetailsSize: 500,
      } as any;

      const recommendations = (service as any).generateRecommendations(
        firstHalf,
        secondHalf,
        'up'
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(
        recommendations.some((rec: string) =>
          rec.includes('scaling AI infrastructure')
        )
      ).toBe(true);
    });

    it('should generate recommendations for downward trend', () => {
      const firstHalf = {
        totalLogs: 100,
        byFeature: { test: 100 },
        averageDetailsSize: 500,
      } as any;

      const secondHalf = {
        totalLogs: 50,
        byFeature: { test: 50 },
        averageDetailsSize: 500,
      } as any;

      const recommendations = (service as any).generateRecommendations(
        firstHalf,
        secondHalf,
        'down'
      );

      expect(
        recommendations.some((rec: string) => rec.includes('decreased usage'))
      ).toBe(true);
    });

    it('should recommend log optimization for large details', () => {
      const firstHalf = {
        totalLogs: 100,
        byFeature: { test: 100 },
        averageDetailsSize: 3000,
      } as any;

      const secondHalf = {
        totalLogs: 100,
        byFeature: { test: 100 },
        averageDetailsSize: 6000,
      } as any;

      const recommendations = (service as any).generateRecommendations(
        firstHalf,
        secondHalf,
        'stable'
      );

      expect(
        recommendations.some((rec: string) =>
          rec.includes('reducing log detail verbosity')
        )
      ).toBe(true);
    });
  });
});
