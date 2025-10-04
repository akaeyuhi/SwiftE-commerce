import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { AnalyticsJobType } from 'src/modules/infrastructure/queues/analytics-queue/types/analytics-queue.types';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { createMock, MockedMethods } from '../../utils/helpers';

describe('AnalyticsQueueService', () => {
  let service: AnalyticsQueueService;
  let queue: Partial<MockedMethods<Queue>>;

  const mockJob = {
    id: 'job-1',
    data: {},
    opts: {},
    remove: jest.fn(),
    retry: jest.fn(),
    attemptsMade: 0,
    finishedOn: Date.now(),
    processedOn: Date.now(),
  } as any;

  beforeEach(async () => {
    queue = createMock<Queue>([
      'add',
      'getJob',
      'getFailed',
      'getCompleted',
      'close',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsQueueService,
        {
          provide: getQueueToken('analytics'),
          useValue: queue,
        },
      ],
    }).compile();

    service = module.get<AnalyticsQueueService>(AnalyticsQueueService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseQueueService', () => {
      expect(service).toBeInstanceOf(AnalyticsQueueService);
    });

    it('should have queue name configured', () => {
      expect((service as any).queueName).toBe('analytics');
    });

    it('should have default options', () => {
      const defaultOptions = (service as any).defaultOptions;
      expect(defaultOptions.priority).toBe(0);
      expect(defaultOptions.maxAttempts).toBe(3);
      expect(defaultOptions.backoff).toBe('exponential');
    });
  });

  describe('addEvent', () => {
    it('should add single event to queue', async () => {
      const event: RecordEventDto = {
        storeId: 's1',
        productId: 'p1',
        userId: 'u1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      const jobId = await service.addEvent(event);

      expect(jobId).toBe('job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        { events: [event] },
        expect.any(Object)
      );
    });

    it('should add event with custom options', async () => {
      const event: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'store',
      };

      queue.add!.mockResolvedValue({ id: 'job-2' } as any);

      await service.addEvent(event, { priority: 5, delay: 1000 });

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        { events: [event] },
        expect.objectContaining({
          priority: 5,
          delay: 1000,
        })
      );
    });
  });

  describe('recordView', () => {
    it('should record product view', async () => {
      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      const jobId = await service.recordView('s1', 'p1', 'u1');

      expect(jobId).toBe('job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [
            expect.objectContaining({
              storeId: 's1',
              productId: 'p1',
              userId: 'u1',
              eventType: AnalyticsEventType.VIEW,
              invokedOn: 'product',
            }),
          ],
        },
        expect.any(Object)
      );
    });

    it('should record store view when no productId', async () => {
      queue.add!.mockResolvedValue({ id: 'job-2' } as any);

      await service.recordView('s1', undefined, 'u1');

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [
            expect.objectContaining({
              invokedOn: 'store',
            }),
          ],
        },
        expect.any(Object)
      );
    });

    it('should include metadata when provided', async () => {
      queue.add!.mockResolvedValue({ id: 'job-3' } as any);
      const meta = { source: 'mobile' };

      await service.recordView('s1', 'p1', 'u1', meta);

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [expect.objectContaining({ meta })],
        },
        expect.any(Object)
      );
    });
  });

  describe('recordLike', () => {
    it('should record like event', async () => {
      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      await service.recordLike('s1', 'p1', 'u1');

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [
            expect.objectContaining({
              eventType: AnalyticsEventType.LIKE,
              invokedOn: 'product',
            }),
          ],
        },
        expect.any(Object)
      );
    });
  });

  describe('recordAddToCart', () => {
    it('should record add to cart event', async () => {
      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      await service.recordAddToCart('s1', 'p1', 'u1', 2);

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [
            expect.objectContaining({
              eventType: AnalyticsEventType.ADD_TO_CART,
              value: 2,
              invokedOn: 'product',
            }),
          ],
        },
        expect.any(Object)
      );
    });

    it('should use default quantity of 1', async () => {
      queue.add!.mockResolvedValue({ id: 'job-2' } as any);

      await service.recordAddToCart('s1', 'p1', 'u1');

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [expect.objectContaining({ value: 1 })],
        },
        expect.any(Object)
      );
    });
  });

  describe('recordPurchase', () => {
    it('should record purchase event', async () => {
      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      await service.recordPurchase('s1', 'p1', 'u1', 99.99);

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [
            expect.objectContaining({
              eventType: AnalyticsEventType.PURCHASE,
              value: 99.99,
              meta: null,
            }),
          ],
        },
        expect.any(Object)
      );
    });

    it('should use default amount of 0', async () => {
      queue.add!.mockResolvedValue({ id: 'job-2' } as any);

      await service.recordPurchase('s1', 'p1', 'u1');

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [expect.objectContaining({ value: 0 })],
        },
        expect.any(Object)
      );
    });
  });

  describe('recordClick', () => {
    it('should record click event', async () => {
      queue.add!.mockResolvedValue({ id: 'job-1' } as any);

      await service.recordClick('s1', 'p1', 'u1');

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_SINGLE,
        {
          events: [
            expect.objectContaining({
              eventType: AnalyticsEventType.CLICK,
            }),
          ],
        },
        expect.any(Object)
      );
    });
  });

  describe('addBatch', () => {
    it('should add batch of events', async () => {
      const events: RecordEventDto[] = [
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
      ];

      queue.add!.mockResolvedValue({ id: 'batch-job-1' } as any);

      const jobId = await service.addBatch(events);

      expect(jobId).toBe('batch-job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.RECORD_BATCH,
        expect.objectContaining({
          events,
          batchId: expect.stringContaining('batch_'),
          metadata: expect.objectContaining({
            batchSize: 2,
          }),
        }),
        expect.any(Object)
      );
    });

    it('should throw error for empty batch', async () => {
      await expect(service.addBatch([])).rejects.toThrow(
        'Cannot add empty batch'
      );
    });

    it('should throw error for null events', async () => {
      await expect(service.addBatch(null as any)).rejects.toThrow(
        'Cannot add empty batch'
      );
    });
  });

  describe('scheduleDailyAggregation', () => {
    it('should schedule daily aggregation', async () => {
      const date = new Date('2025-10-01');
      queue.add!.mockResolvedValue({ id: 'agg-job-1' } as any);

      const jobId = await service.scheduleDailyAggregation(date);

      expect(jobId).toBe('agg-job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.AGGREGATE_DAILY,
        expect.objectContaining({
          metadata: expect.objectContaining({
            aggregationDate: '2025-10-01',
          }),
        }),
        expect.objectContaining({
          priority: 5,
        })
      );
    });

    it('should use current date by default', async () => {
      queue.add!.mockResolvedValue({ id: 'agg-job-2' } as any);

      await service.scheduleDailyAggregation();

      const today = new Date().toISOString().split('T')[0];
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.AGGREGATE_DAILY,
        expect.objectContaining({
          metadata: expect.objectContaining({
            aggregationDate: today,
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('scheduleCleanup', () => {
    it('should schedule cleanup job', async () => {
      queue.add!.mockResolvedValue({ id: 'cleanup-job-1' } as any);

      const jobId = await service.scheduleCleanup(60);

      expect(jobId).toBe('cleanup-job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.CLEANUP_OLD,
        expect.objectContaining({
          metadata: expect.objectContaining({
            daysToKeep: 60,
          }),
        }),
        expect.objectContaining({
          priority: 1,
        })
      );
    });

    it('should use default 90 days', async () => {
      queue.add!.mockResolvedValue({ id: 'cleanup-job-2' } as any);

      await service.scheduleCleanup();

      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.CLEANUP_OLD,
        expect.objectContaining({
          metadata: expect.objectContaining({
            daysToKeep: 90,
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('scheduleMetricsProcessing', () => {
    it('should schedule metrics processing', async () => {
      queue.add!.mockResolvedValue({ id: 'metrics-job-1' } as any);

      const jobId = await service.scheduleMetricsProcessing();

      expect(jobId).toBe('metrics-job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.PROCESS_METRICS,
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'metrics_processing',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('scheduleReportGeneration', () => {
    it('should schedule report generation', async () => {
      queue.add!.mockResolvedValue({ id: 'report-job-1' } as any);

      const jobId = await service.scheduleReportGeneration('monthly', {
        month: 'October',
      });

      expect(jobId).toBe('report-job-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.GENERATE_REPORT,
        expect.objectContaining({
          metadata: expect.objectContaining({
            reportType: 'monthly',
            month: 'October',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('scheduleRecurring', () => {
    it('should schedule recurring job with cron', async () => {
      queue.add!.mockResolvedValue({ id: 'recurring-1' } as any);

      const jobId = await service.scheduleRecurring(
        AnalyticsJobType.AGGREGATE_DAILY,
        '0 2 * * *',
        { events: [], metadata: {} }
      );

      expect(jobId).toBe('recurring-1');
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.AGGREGATE_DAILY,
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({
            cron: '0 2 * * *',
          }),
        })
      );
    });
  });

  describe('setupRecurringJobs', () => {
    it('should setup all recurring jobs', async () => {
      queue.add!.mockResolvedValue({ id: 'recurring-job' } as any);

      await service.setupRecurringJobs();

      expect(queue.add).toHaveBeenCalledTimes(3);
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.AGGREGATE_DAILY,
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({ cron: '0 2 * * *' }),
        })
      );
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.CLEANUP_OLD,
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({ cron: '0 3 * * 0' }),
        })
      );
      expect(queue.add).toHaveBeenCalledWith(
        AnalyticsJobType.PROCESS_METRICS,
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({ cron: '0 * * * *' }),
        })
      );
    });

    it('should handle setup errors', async () => {
      queue.add!.mockRejectedValue(new Error('Setup failed'));

      await expect(service.setupRecurringJobs()).rejects.toThrow(
        'Setup failed'
      );
    });
  });

  describe('retryFailed', () => {
    it('should retry failed jobs', async () => {
      const failedJob = {
        ...mockJob,
        id: 'failed-1',
        name: AnalyticsJobType.RECORD_SINGLE,
        attemptsMade: 1,
        opts: { attempts: 3 },
        retry: jest.fn(),
      };

      queue.getFailed!.mockResolvedValue([failedJob]);

      const retriedCount = await service.retryFailed();

      expect(retriedCount).toBe(1);
      expect(failedJob.retry).toHaveBeenCalled();
    });

    it('should filter by job type', async () => {
      const failedJobs = [
        {
          ...mockJob,
          id: '1',
          name: AnalyticsJobType.RECORD_SINGLE,
          attemptsMade: 1,
          opts: { attempts: 3 },
          retry: jest.fn(),
        },
        {
          ...mockJob,
          id: '2',
          name: AnalyticsJobType.RECORD_BATCH,
          attemptsMade: 1,
          opts: { attempts: 3 },
          retry: jest.fn(),
        },
      ];

      queue.getFailed!.mockResolvedValue(failedJobs);

      await service.retryFailed(AnalyticsJobType.RECORD_SINGLE);

      expect(failedJobs[0].retry).toHaveBeenCalled();
      expect(failedJobs[1].retry).not.toHaveBeenCalled();
    });

    it('should not retry exhausted jobs', async () => {
      const exhaustedJob = {
        ...mockJob,
        attemptsMade: 3,
        opts: { attempts: 3 },
        retry: jest.fn(),
      };

      queue.getFailed!.mockResolvedValue([exhaustedJob]);

      const retriedCount = await service.retryFailed();

      expect(retriedCount).toBe(0);
      expect(exhaustedJob.retry).not.toHaveBeenCalled();
    });
  });

  describe('purgeCompleted', () => {
    it('should purge old completed jobs', async () => {
      const oldJob = {
        ...mockJob,
        id: 'old-1',
        finishedOn: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        remove: jest.fn(),
      };

      const recentJob = {
        ...mockJob,
        id: 'recent-1',
        finishedOn: Date.now() - 1 * 60 * 60 * 1000, // 1 hour ago
        remove: jest.fn(),
      };

      queue.getCompleted!.mockResolvedValue([oldJob, recentJob]);
      queue.getFailed!.mockResolvedValue([]);

      const purgedCount = await service.purgeCompleted(24);

      expect(purgedCount).toBe(1);
      expect(oldJob.remove).toHaveBeenCalled();
      expect(recentJob.remove).not.toHaveBeenCalled();
    });

    it('should purge old failed jobs', async () => {
      const oldFailedJob = {
        ...mockJob,
        finishedOn: Date.now() - 50 * 60 * 60 * 1000,
        remove: jest.fn(),
      };

      queue.getCompleted!.mockResolvedValue([]);
      queue.getFailed!.mockResolvedValue([oldFailedJob]);

      const purgedCount = await service.purgeCompleted(24);

      expect(purgedCount).toBe(1);
      expect(oldFailedJob.remove).toHaveBeenCalled();
    });
  });

  describe('removeJob', () => {
    it('should remove job by id', async () => {
      queue.getJob!.mockResolvedValue(mockJob);

      await (service as any).removeJob('job-1');

      expect(queue.getJob).toHaveBeenCalledWith('job-1');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should handle non-existent job', async () => {
      queue.getJob!.mockResolvedValue(null);

      await (service as any).removeJob('non-existent');

      expect(queue.getJob).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close queue', async () => {
      queue.close!.mockResolvedValue(undefined);

      await service.close();

      expect(queue.close).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      queue.close!.mockRejectedValue(new Error('Close failed'));

      await service.close();

      expect(queue.close).toHaveBeenCalled();
    });
  });

  describe('convertToBullOptions', () => {
    it('should convert QueueOptions to Bull JobOptions', () => {
      const options = {
        priority: 5,
        delay: 1000,
        maxAttempts: 3,
        backoff: 'exponential' as const,
        backoffDelay: 2000,
        removeOnComplete: 100,
        removeOnFail: 50,
        jobId: 'custom-id',
      };

      const bullOptions = (service as any).convertToBullOptions(options);

      expect(bullOptions.priority).toBe(5);
      expect(bullOptions.delay).toBe(1000);
      expect(bullOptions.attempts).toBe(3);
      expect(bullOptions.jobId).toBe('custom-id');
    });

    it('should handle empty options', () => {
      const bullOptions = (service as any).convertToBullOptions();

      expect(bullOptions).toEqual({});
    });

    it('should set default removeOnComplete', () => {
      const bullOptions = (service as any).convertToBullOptions({});

      expect(bullOptions.removeOnComplete).toBe(100);
    });
  });
});
