import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';
import { QueueOptions } from 'src/common/interfaces/infrastructure/queue.interface';
import { RecordEventDto } from './dto/record-event.dto';
import {
  AnalyticsJobData,
  AnalyticsJobType,
} from './types/analytics-queue.types';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';

/**
 * AnalyticsQueueService (Global)
 *
 * Pure infrastructure service - NO business logic dependencies.
 * Does NOT import AnalyticsEventRepository or any analytics business modules.
 * All processing logic is in AnalyticsQueueProcessor.
 */
@Injectable()
export class AnalyticsQueueService extends BaseQueueService<AnalyticsJobData> {
  protected readonly queueName = 'analytics';
  protected readonly logger = new Logger(AnalyticsQueueService.name);

  protected readonly defaultOptions: QueueOptions = {
    priority: 0,
    maxAttempts: 3,
    backoff: 'exponential',
    backoffDelay: 2000,
  };

  constructor(@InjectQueue('analytics') protected readonly queue: Queue) {
    super(queue);
  }

  // ===============================
  // Queue Management
  // ===============================

  protected async addJob(
    jobType: string,
    data: AnalyticsJobData,
    options?: QueueOptions
  ): Promise<string> {
    const bullOptions: JobOptions = this.convertToBullOptions(options);
    const job = await this.queue.add(jobType, data, bullOptions);
    return job.id.toString();
  }

  protected async processJob(
    jobType: string,
    data: AnalyticsJobData,
    job: any
  ): Promise<any> {
    this.logger.debug(`Job ${job.id} will be processed by processor`);
    return { jobType, data };
  }

  protected async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id.toString(),
      type: job.name,
      data: job.data,
      priority: job.opts.priority || 0,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
      delay: job.opts.delay || 0,
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedAt: job.failedReason ? new Date() : undefined,
      error: job.failedReason,
      progress: job.progress(),
      state: await job.getState(),
    };
  }

  protected async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Removed job ${jobId}`);
    }
  }

  // ===============================
  // Public Analytics API Methods
  // ===============================

  /**
   * Record a single analytics event
   */
  async addEvent(
    event: RecordEventDto,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.RECORD_SINGLE,
      { events: [event] },
      options
    );
  }

  async recordView(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ): Promise<string> {
    const ev: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.VIEW,
      invokedOn: productId ? 'product' : 'store',
      meta,
    };
    return this.addEvent(ev);
  }

  async recordLike(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ): Promise<string> {
    const ev: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.LIKE,
      invokedOn: productId ? 'product' : 'store',
      meta,
    };
    return this.addEvent(ev);
  }

  async recordAddToCart(
    storeId: string,
    productId: string,
    userId?: string,
    quantity = 1,
    meta?: any
  ): Promise<string> {
    const ev: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.ADD_TO_CART,
      invokedOn: 'product',
      value: quantity,
      meta,
    };
    return this.addEvent(ev);
  }

  async recordPurchase(
    storeId: string,
    productId: string,
    userId: string,
    amount = 0,
    meta?: any
  ): Promise<string> {
    const ev: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.PURCHASE,
      invokedOn: 'product',
      value: amount,
      meta: meta || null,
    };
    return this.addEvent(ev);
  }

  async recordClick(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ): Promise<string> {
    const ev: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.CLICK,
      invokedOn: productId ? 'product' : 'store',
      meta,
    };
    return this.addEvent(ev);
  }

  /**
   * Record multiple analytics events in batch
   */
  async addBatch(
    events: RecordEventDto[],
    options?: QueueOptions
  ): Promise<string> {
    if (!events?.length) {
      throw new Error('Cannot add empty batch');
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return this.scheduleJob(
      AnalyticsJobType.RECORD_BATCH,
      {
        events,
        batchId,
        metadata: {
          batchSize: events.length,
          createdAt: new Date().toISOString(),
        },
      },
      options
    );
  }

  /**
   * Schedule daily aggregation job
   */
  async scheduleDailyAggregation(
    date: Date = new Date(),
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.AGGREGATE_DAILY,
      {
        events: [],
        metadata: {
          aggregationDate: date.toISOString().split('T')[0],
          scheduledAt: new Date().toISOString(),
        },
      },
      {
        priority: 5,
        ...options,
      }
    );
  }

  /**
   * Schedule cleanup of old events
   */
  async scheduleCleanup(
    daysToKeep: number = 90,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.CLEANUP_OLD,
      {
        events: [],
        metadata: {
          daysToKeep,
          scheduledAt: new Date().toISOString(),
        },
      },
      {
        priority: 1,
        ...options,
      }
    );
  }

  /**
   * Schedule metrics processing
   */
  async scheduleMetricsProcessing(options?: QueueOptions): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.PROCESS_METRICS,
      {
        events: [],
        metadata: {
          type: 'metrics_processing',
          scheduledAt: new Date().toISOString(),
        },
      },
      options
    );
  }

  /**
   * Schedule report generation
   */
  async scheduleReportGeneration(
    reportType: string,
    metadata?: Record<string, any>,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.GENERATE_REPORT,
      {
        events: [],
        metadata: {
          reportType,
          ...metadata,
          scheduledAt: new Date().toISOString(),
        },
      },
      options
    );
  }

  /**
   * Schedule recurring analytics jobs
   */
  async scheduleRecurring(
    jobType: string,
    cronExpression: string,
    data: AnalyticsJobData
  ): Promise<string> {
    const job = await this.queue.add(jobType, data, {
      repeat: {
        cron: cronExpression,
        tz: process.env.TZ || 'UTC',
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    this.logger.log(
      `Scheduled recurring job ${jobType} with cron: ${cronExpression}`
    );
    return job.id.toString();
  }

  /**
   * Set up recurring analytics jobs
   */
  async setupRecurringJobs(): Promise<void> {
    try {
      // Daily aggregation at 2 AM
      await this.scheduleRecurring(
        AnalyticsJobType.AGGREGATE_DAILY,
        '0 2 * * *',
        {
          events: [],
          metadata: { type: 'daily_aggregation' },
        }
      );

      // Weekly cleanup on Sunday at 3 AM
      await this.scheduleRecurring(AnalyticsJobType.CLEANUP_OLD, '0 3 * * 0', {
        events: [],
        metadata: { type: 'weekly_cleanup', daysToKeep: 90 },
      });

      // Hourly metrics processing
      await this.scheduleRecurring(
        AnalyticsJobType.PROCESS_METRICS,
        '0 * * * *',
        {
          events: [],
          metadata: { type: 'hourly_metrics' },
        }
      );

      this.logger.log('Set up recurring analytics jobs');
    } catch (error) {
      this.logger.error('Failed to setup recurring jobs:', error);
      throw error;
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailed(jobType?: string): Promise<number> {
    const failedJobs = await this.queue.getFailed();
    let retriedCount = 0;

    for (const job of failedJobs) {
      if (jobType && job.name !== jobType) continue;

      const maxAttempts =
        job.opts.attempts || this.defaultOptions.maxAttempts || 3;
      if (job.attemptsMade < maxAttempts) {
        await job.retry();
        retriedCount++;
        this.logger.debug(`Retried failed job ${job.id} (${job.name})`);
      } else {
        this.logger.warn(
          `Job ${job.id} (${job.name}) has exhausted all retry attempts`
        );
      }
    }

    this.logger.log(
      `Retried ${retriedCount} failed jobs${jobType ? ` of type ${jobType}` : ''}`
    );
    return retriedCount;
  }

  /**
   * Clean up completed jobs
   */
  async purgeCompleted(olderThanHours: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    const completedJobs = await this.queue.getCompleted();
    let purgedCount = 0;

    for (const job of completedJobs) {
      const jobCompletedAt = job.finishedOn || job.processedOn;
      if (jobCompletedAt && jobCompletedAt < cutoffTime) {
        await job.remove();
        purgedCount++;
      }
    }

    const failedJobs = await this.queue.getFailed();
    for (const job of failedJobs) {
      const jobFailedAt = job.finishedOn || job.processedOn;
      if (jobFailedAt && jobFailedAt < cutoffTime) {
        await job.remove();
        purgedCount++;
      }
    }

    this.logger.log(
      `Purged ${purgedCount} completed jobs older than ${olderThanHours} hours`
    );
    return purgedCount;
  }

  // ===============================
  // Utility Methods
  // ===============================

  private convertToBullOptions(options?: QueueOptions): JobOptions {
    if (!options) return {};

    return {
      priority: options.priority,
      delay: options.delay,
      attempts: options.maxAttempts,
      backoff:
        options.backoff === 'exponential'
          ? {
              type: 'exponential',
              delay: options.backoffDelay || 2000,
            }
          : options.backoffDelay || 2000,
      removeOnComplete:
        options.removeOnComplete !== undefined ? options.removeOnComplete : 100,
      removeOnFail:
        options.removeOnFail !== undefined ? options.removeOnFail : 50,
      jobId: options.jobId,
    };
  }

  async close(): Promise<void> {
    try {
      await this.queue.close();
      this.logger.log('Analytics queue closed');
    } catch (error) {
      this.logger.error('Failed to close analytics queue:', error);
    }
  }
}
