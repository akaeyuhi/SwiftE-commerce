import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { AnalyticsQueueProcessor } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.processor';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { createMock, MockedMethods } from '../utils/helpers';

describe('AnalyticsQueueProcessor', () => {
  let processor: AnalyticsQueueProcessor;
  let moduleRef: Partial<MockedMethods<ModuleRef>>;
  let mockEventsRepo: any;
  let mockStoreStatsRepo: any;
  let mockProductStatsRepo: any;

  const createMockJob = (data: any): Partial<Job> => ({
    id: 'job-1',
    data,
    progress: jest.fn().mockResolvedValue(undefined),
    name: 'test-job',
  });

  beforeEach(async () => {
    mockEventsRepo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    mockStoreStatsRepo = {
      save: jest.fn().mockResolvedValue({}),
    };

    mockProductStatsRepo = {
      save: jest.fn().mockResolvedValue({}),
    };

    moduleRef = createMock<ModuleRef>(['get']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsQueueProcessor,
        { provide: ModuleRef, useValue: moduleRef },
      ],
    }).compile();

    processor = module.get<AnalyticsQueueProcessor>(AnalyticsQueueProcessor);

    // Setup moduleRef mocks
    moduleRef.get!.mockImplementation((token: any) => {
      if (token.name === 'AnalyticsEventRepository') {
        return mockEventsRepo;
      }
      if (token.name === 'StoreDailyStatsRepository') {
        return mockStoreStatsRepo;
      }
      if (token.name === 'ProductDailyStatsRepository') {
        return mockProductStatsRepo;
      }
      return null;
    });

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });
  });

  describe('handleRecordSingle', () => {
    it('should process single event', async () => {
      const job = createMockJob({
        events: [
          {
            storeId: 's1',
            productId: 'p1',
            userId: 'u1',
            eventType: AnalyticsEventType.VIEW,
            invokedOn: 'product',
          },
        ],
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);
      mockEventsRepo.save.mockResolvedValue([{}]);

      const result = await processor.handleRecordSingle(job as Job);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(mockEventsRepo.create).toHaveBeenCalled();
      expect(mockEventsRepo.save).toHaveBeenCalled();
    });

    it('should throw error for empty events', async () => {
      const job = createMockJob({ events: [] });

      await expect(processor.handleRecordSingle(job as Job)).rejects.toThrow(
        'No events to process'
      );
    });

    it('should handle repository errors', async () => {
      const job = createMockJob({
        events: [{ eventType: AnalyticsEventType.VIEW }],
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockRejectedValue(new Error('Repository not available'));

      await expect(processor.handleRecordSingle(job as Job)).rejects.toThrow();
    });
  });

  describe('handleRecordBatch', () => {
    it('should process batch of events', async () => {
      const job = createMockJob({
        events: [
          {
            storeId: 's1',
            eventType: AnalyticsEventType.VIEW,
            invokedOn: 'store',
          },
          {
            storeId: 's1',
            productId: 'p1',
            eventType: AnalyticsEventType.LIKE,
            invokedOn: 'product',
          },
        ],
        batchId: 'batch-123',
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);

      const result = await processor.handleRecordBatch(job as Job);

      expect(result.success).toBe(true);
      expect(result.batchId).toBe('batch-123');
      expect(result.processed).toBe(2);
      expect(job.progress).toHaveBeenCalledTimes(3); // 25, 75, 100
    });

    it('should update progress during batch processing', async () => {
      const job = createMockJob({
        events: [{ eventType: AnalyticsEventType.VIEW }],
        batchId: 'batch-123',
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);

      await processor.handleRecordBatch(job as Job);

      expect(job.progress).toHaveBeenCalledWith(25);
      expect(job.progress).toHaveBeenCalledWith(75);
      expect(job.progress).toHaveBeenCalledWith(100);
    });

    it('should throw error for empty batch', async () => {
      const job = createMockJob({ events: [], batchId: 'batch-123' });

      await expect(processor.handleRecordBatch(job as Job)).rejects.toThrow(
        'No events in batch to process'
      );
    });
  });

  describe('handleAggregateDaily', () => {
    it('should aggregate daily metrics', async () => {
      const job = createMockJob({
        metadata: { aggregationDate: '2025-10-01' },
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);
      jest
        .spyOn(processor as any, 'getStoreStatsRepository')
        .mockResolvedValue(mockStoreStatsRepo);
      jest
        .spyOn(processor as any, 'getProductStatsRepository')
        .mockResolvedValue(mockProductStatsRepo);

      const storeMetrics = [
        {
          storeId: 's1',
          views: '10',
          likes: '5',
          addToCarts: '2',
          purchases: '1',
          revenue: '99.99',
        },
      ];
      const productMetrics = [
        {
          productId: 'p1',
          views: '20',
          likes: '8',
          addToCarts: '4',
          purchases: '2',
          revenue: '199.98',
        },
      ];

      mockEventsRepo.getRawMany
        .mockResolvedValueOnce(storeMetrics)
        .mockResolvedValueOnce(productMetrics);

      const result = await processor.handleAggregateDaily(job as Job);

      expect(result.success).toBe(true);
      expect(result.storesAggregated).toBe(1);
      expect(result.productsAggregated).toBe(1);
      expect(mockStoreStatsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 's1',
          views: 10,
          purchases: 1,
          revenue: 99.99,
        })
      );
      expect(mockProductStatsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'p1',
          views: 20,
          purchases: 2,
          revenue: 199.98,
        })
      );
    });

    it('should use current date if not provided', async () => {
      const job = createMockJob({ metadata: {} });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);
      jest
        .spyOn(processor as any, 'getStoreStatsRepository')
        .mockResolvedValue(mockStoreStatsRepo);
      jest
        .spyOn(processor as any, 'getProductStatsRepository')
        .mockResolvedValue(mockProductStatsRepo);

      await processor.handleAggregateDaily(job as Job);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(mockEventsRepo.where).toHaveBeenCalledWith(
        'DATE(event.createdAt) = :date',
        {
          date: today.toISOString().split('T')[0],
        }
      );
    });

    it('should update progress throughout aggregation', async () => {
      const job = createMockJob({ metadata: {} });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);
      jest
        .spyOn(processor as any, 'getStoreStatsRepository')
        .mockResolvedValue(mockStoreStatsRepo);
      jest
        .spyOn(processor as any, 'getProductStatsRepository')
        .mockResolvedValue(mockProductStatsRepo);

      await processor.handleAggregateDaily(job as Job);

      expect(job.progress).toHaveBeenCalledWith(10);
      expect(job.progress).toHaveBeenCalledWith(20);
      expect(job.progress).toHaveBeenCalledWith(50);
      expect(job.progress).toHaveBeenCalledWith(70);
      expect(job.progress).toHaveBeenCalledWith(90);
      expect(job.progress).toHaveBeenCalledWith(100);
    });
  });

  describe('handleCleanupOld', () => {
    it('should cleanup old events', async () => {
      const job = createMockJob({
        metadata: { daysToKeep: 60 },
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);
      mockEventsRepo.execute.mockResolvedValue({ affected: 150 });

      const result = await processor.handleCleanupOld(job as Job);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(150);
      expect(result.daysToKeep).toBe(60);
      expect(mockEventsRepo.delete).toHaveBeenCalled();
    });

    it('should use default 90 days', async () => {
      const job = createMockJob({ metadata: {} });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);

      const result = await processor.handleCleanupOld(job as Job);

      expect(result.daysToKeep).toBe(90);
    });

    it('should update progress', async () => {
      const job = createMockJob({ metadata: {} });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);

      await processor.handleCleanupOld(job as Job);

      expect(job.progress).toHaveBeenCalledWith(50);
      expect(job.progress).toHaveBeenCalledWith(100);
    });
  });

  describe('handleProcessMetrics', () => {
    it('should process metrics', async () => {
      const job = createMockJob({ metadata: {} });

      const result = await processor.handleProcessMetrics(job as Job);

      expect(result.success).toBe(true);
      expect(result.type).toBe('metrics_processing');
    });

    it('should update progress', async () => {
      const job = createMockJob({ metadata: {} });

      await processor.handleProcessMetrics(job as Job);

      expect(job.progress).toHaveBeenCalledWith(50);
      expect(job.progress).toHaveBeenCalledWith(100);
    });
  });

  describe('handleGenerateReport', () => {
    it('should generate report', async () => {
      const job = createMockJob({
        metadata: { reportType: 'monthly' },
      });

      const result = await processor.handleGenerateReport(job as Job);

      expect(result.success).toBe(true);
      expect(result.reportType).toBe('monthly');
    });

    it('should use default report type', async () => {
      const job = createMockJob({ metadata: {} });

      const result = await processor.handleGenerateReport(job as Job);

      expect(result.reportType).toBe('default');
    });
  });

  describe('handleLegacyRecord', () => {
    it('should handle legacy single event', async () => {
      const job = createMockJob({
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);

      const result = await processor.handleLegacyRecord(job as Job);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });

    it('should handle legacy array of events', async () => {
      const job = createMockJob([
        { storeId: 's1', eventType: AnalyticsEventType.VIEW },
        { storeId: 's1', eventType: AnalyticsEventType.LIKE },
      ]);

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);

      const result = await processor.handleLegacyRecord(job as Job);

      expect(result.processed).toBe(2);
    });
  });

  describe('lazy loading helpers', () => {
    it('should lazy load AnalyticsEventRepository', async () => {
      const repo = await (processor as any).getAnalyticsEventRepository();

      expect(moduleRef.get).toHaveBeenCalled();
      expect(repo).toBe(mockEventsRepo);
    });

    it('should handle repository loading errors', async () => {
      moduleRef.get!.mockImplementation(() => {
        throw new Error('Module not found');
      });

      await expect(
        (processor as any).getAnalyticsEventRepository()
      ).rejects.toThrow(
        'AnalyticsEventRepository not available. Make sure AnalyticsModule is loaded.'
      );
    });
  });

  describe('error handling', () => {
    it('should handle processing errors', async () => {
      const job = createMockJob({
        events: [{ eventType: AnalyticsEventType.VIEW }],
      });

      jest
        .spyOn(processor as any, 'getAnalyticsEventRepository')
        .mockResolvedValue(mockEventsRepo);
      mockEventsRepo.save.mockRejectedValue(new Error('Database error'));

      await expect(processor.handleRecordSingle(job as Job)).rejects.toThrow(
        'Database error'
      );
    });
  });
});
