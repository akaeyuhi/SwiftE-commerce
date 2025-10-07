import { Test, TestingModule } from '@nestjs/testing';
import { AiLogsController } from 'src/modules/ai/ai-logs/ai-logs.controller';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import {
  CreateAiLogDto,
  LogQueryDto,
  UsageStatsQueryDto,
  CleanupLogsDto,
} from 'src/modules/ai/ai-logs/dto/create-ai-log.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/helpers';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';

describe('AiLogsController', () => {
  let controller: AiLogsController;
  let logsService: Partial<MockedMethods<AiLogsService>>;

  const mockUser = { id: 'u1', storeId: 's1', isAdmin: false };
  const mockAdminUser = { id: 'admin1', storeId: null, isAdmin: true };
  const mockRequest = { user: mockUser } as any;
  const mockAdminRequest = { user: mockAdminUser } as any;

  beforeEach(async () => {
    const guardMock = createGuardMock();
    const policyMock = createPolicyMock();

    logsService = createServiceMock<AiLogsService>([
      'record',
      'findByFilter',
      'getUsageStats',
      'getTopFeatures',
      'getDailyUsage',
      'getErrorLogs',
      'getUsageTrends',
      'healthCheck',
      'cleanup',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiLogsController],
      providers: [
        { provide: PolicyService, useValue: policyMock },
        { provide: AiLogsService, useValue: logsService },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<AiLogsController>(AiLogsController);

    jest.clearAllMocks();
  });

  describe('createLog', () => {
    it('should create log successfully', async () => {
      const dto: CreateAiLogDto = {
        feature: 'description_generator',
        prompt: 'Test prompt',
        storeId: 's1',
      };

      const log = {
        id: 'log1',
        createdAt: new Date(),
      };

      logsService.record!.mockResolvedValue(log as any);

      const result = await controller.createLog(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.logId).toBe('log1');
      expect(logsService.record).toHaveBeenCalledWith({
        userId: 'u1',
        storeId: 's1',
        feature: 'description_generator',
        prompt: 'Test prompt',
        details: undefined,
      });
    });

    it('should use user context when dto fields missing', async () => {
      const dto: CreateAiLogDto = {
        feature: 'test_feature',
        prompt: 'Test',
      };

      logsService.record!.mockResolvedValue({
        id: 'log1',
        createdAt: new Date(),
      } as any);

      await controller.createLog(dto, mockRequest);

      expect(logsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          storeId: 's1',
        })
      );
    });

    it('should throw BadRequestException on error', async () => {
      const dto: CreateAiLogDto = {
        feature: 'test_feature',
        prompt: 'Test',
      };

      logsService.record!.mockRejectedValue(new Error('DB error'));

      await expect(controller.createLog(dto, mockRequest)).rejects.toThrow(
        'Failed to create log'
      );
    });
  });

  describe('getLogs', () => {
    it('should get logs with filters', async () => {
      const query: LogQueryDto = {
        feature: 'description_generator',
        limit: 50,
        offset: 0,
      };

      const logs = [{ id: 'log1' }, { id: 'log2' }];
      logsService.findByFilter!.mockResolvedValue(logs as any);

      const result = await controller.getLogs(query, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.logs).toEqual(logs);
      expect(result.data.metadata.count).toBe(2);
    });

    it('should apply security filters for non-admin users', async () => {
      const query: LogQueryDto = {};
      logsService.findByFilter!.mockResolvedValue([]);

      await controller.getLogs(query, mockRequest);

      const filters = { storeId: 's1' };
      expect(logsService.findByFilter).toHaveBeenCalledWith(
        filters,
        expect.any(Object)
      );
    });

    it('should allow admins to filter by specific store', async () => {
      const query: LogQueryDto = { storeId: 's2' };
      logsService.findByFilter!.mockResolvedValue([]);

      await controller.getLogs(query, mockAdminRequest);

      expect(logsService.findByFilter).toHaveBeenCalledWith(
        { storeId: 's2' },
        expect.any(Object)
      );
    });

    it('should handle date filters', async () => {
      const query: LogQueryDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      };

      logsService.findByFilter!.mockResolvedValue([]);

      await controller.getLogs(query, mockRequest);

      expect(logsService.findByFilter).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          dateFrom: new Date('2025-01-01'),
          dateTo: new Date('2025-01-31'),
        })
      );
    });
  });

  describe('getUsageStats', () => {
    it('should get usage statistics', async () => {
      const query: UsageStatsQueryDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      };

      const stats = {
        totalLogs: 100,
        // eslint-disable-next-line camelcase
        byFeature: { test_feature: 100 },
      } as any;

      logsService.getUsageStats!.mockResolvedValue(stats);

      const result = await controller.getUsageStats(query, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.stats).toEqual(stats);
    });
  });

  describe('getTopFeatures', () => {
    it('should get top features', async () => {
      const query: UsageStatsQueryDto = {};
      const topFeatures = [
        { feature: 'description_generator', count: 50, percentage: 50 },
        { feature: 'name_generator', count: 30, percentage: 30 },
      ];

      logsService.getTopFeatures!.mockResolvedValue(topFeatures);

      const result = await controller.getTopFeatures(10, query, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.features).toEqual(topFeatures);
    });

    it('should use default limit', async () => {
      logsService.getTopFeatures!.mockResolvedValue([]);

      await controller.getTopFeatures(undefined as any, {}, mockRequest);

      expect(logsService.getTopFeatures).toHaveBeenCalledWith(
        10,
        expect.any(Object)
      );
    });
  });

  describe('getDailyUsage', () => {
    it('should get daily usage metrics', async () => {
      const dailyUsage = [
        { date: '2025-01-15', count: 50, uniqueUsers: 10 },
      ] as any;

      logsService.getDailyUsage!.mockResolvedValue(dailyUsage);

      const result = await controller.getDailyUsage(30, {}, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.dailyUsage).toEqual(dailyUsage);
    });
  });

  describe('getErrorLogs', () => {
    it('should get error logs', async () => {
      const errorLogs = [{ id: 'log1', details: { error: 'Test error' } }];

      logsService.getErrorLogs!.mockResolvedValue(errorLogs as any);

      const result = await controller.getErrorLogs(100, {}, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.errorLogs).toEqual(errorLogs);
      expect(result.data.metadata.count).toBe(1);
    });
  });

  describe('getUsageTrends', () => {
    it('should get usage trends', async () => {
      const trends = { increasing: true, growthRate: 0.15 } as any;

      logsService.getUsageTrends!.mockResolvedValue(trends);

      const result = await controller.getUsageTrends(30, {}, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.trends).toEqual(trends);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = { healthy: true, logsCount: 1000 } as any;

      logsService.healthCheck!.mockResolvedValue(health);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data.healthy).toBe(true);
    });

    it('should return unhealthy status on error', async () => {
      logsService.healthCheck!.mockRejectedValue(new Error('Service error'));

      const result = await controller.healthCheck();

      expect(result.success).toBe(false);
      expect(result.data.error).toBe('Service error');
    });
  });

  describe('cleanupLogs', () => {
    it('should cleanup old logs', async () => {
      const dto: CleanupLogsDto = {
        retentionDays: 30,
        dryRun: false,
      };

      const cleanupResult = {
        deletedCount: 500,
        preservedCount: 1000,
      } as any;

      logsService.cleanup!.mockResolvedValue(cleanupResult);

      const result = await controller.cleanupLogs(dto);

      expect(result.success).toBe(true);
      expect(result.data.deletedCount).toBe(500);
      expect(logsService.cleanup).toHaveBeenCalledWith(30, false);
    });

    it('should use default values', async () => {
      const dto: CleanupLogsDto = {};

      logsService.cleanup!.mockResolvedValue({
        deletedCount: 0,
      } as any);

      await controller.cleanupLogs(dto);

      expect(logsService.cleanup).toHaveBeenCalledWith(30, false);
    });

    it('should throw BadRequestException on error', async () => {
      const dto: CleanupLogsDto = {};

      logsService.cleanup!.mockRejectedValue(new Error('Cleanup failed'));

      await expect(controller.cleanupLogs(dto)).rejects.toThrow(
        'Cleanup failed'
      );
    });
  });

  describe('buildSecurityFilters', () => {
    it('should restrict non-admin users to their storeId', () => {
      const filters = (controller as any).buildSecurityFilters({}, mockUser);

      expect(filters.storeId).toBe('s1');
      expect(filters.userId).toBeUndefined();
    });

    it('should restrict non-admin users without storeId to userId', () => {
      const userWithoutStore = { id: 'u2', isAdmin: false };
      const filters = (controller as any).buildSecurityFilters(
        {},
        userWithoutStore
      );

      expect(filters.userId).toBe('u2');
      expect(filters.storeId).toBeUndefined();
    });

    it('should allow admins to filter by specific store', () => {
      const query = { storeId: 's2' };
      const filters = (controller as any).buildSecurityFilters(
        query,
        mockAdminUser
      );

      expect(filters.storeId).toBe('s2');
    });

    it('should allow admins to filter by specific user', () => {
      const query = { userId: 'u3' };
      const filters = (controller as any).buildSecurityFilters(
        query,
        mockAdminUser
      );

      expect(filters.userId).toBe('u3');
    });
  });
});
