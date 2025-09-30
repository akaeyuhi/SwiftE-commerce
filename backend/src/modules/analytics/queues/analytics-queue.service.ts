import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions } from 'bull';
import { RecordEventDto } from '../dto/record-event.dto';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';
import { QueueOptions } from 'src/common/interfaces/infrastructure/queue.interface';

export interface AnalyticsJobData {
  events: RecordEventDto[];
  batchId?: string;
  priority?: number;
  userId?: string;
  storeId?: string;
  metadata?: Record<string, any>;
}

export enum AnalyticsJobType {
  RECORD_SINGLE = 'record_single',
  RECORD_BATCH = 'record_batch',
  AGGREGATE_DAILY = 'aggregate_daily',
  CLEANUP_OLD = 'cleanup_old',
  PROCESS_METRICS = 'process_metrics',
  GENERATE_REPORT = 'generate_report',
}

/**
 * AnalyticsQueueService
 *
 * Extends BaseQueueService to provide analytics-specific job processing.
 * Handles event recording, batch processing, aggregation, cleanup tasks,
 * and recurring analytics operations.
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

  constructor(
    @InjectQueue('analytics') protected readonly queue: Queue,
    private readonly eventsRepo: AnalyticsEventRepository
  ) {
    super(queue);
  }

  /**
   * Add job to Bull queue
   */
  protected async addJob(
    jobType: string,
    data: AnalyticsJobData,
    options?: QueueOptions
  ): Promise<string> {
    const bullOptions: JobOptions = this.convertToBullOptions(options);
    const job = await this.queue.add(jobType, data, bullOptions);
    return job.id.toString();
  }

  /**
   * Process analytics jobs
   */
  protected async processJob(
    jobType: string,
    data: AnalyticsJobData,
    job: any
  ): Promise<any> {
    this.logger.debug(`Processing ${jobType} job ${job.id}`);

    try {
      switch (jobType) {
        case AnalyticsJobType.RECORD_SINGLE:
          return await this.processSingleRecord(data, job);

        case AnalyticsJobType.RECORD_BATCH:
          return await this.processBatchRecord(data, job);

        case AnalyticsJobType.AGGREGATE_DAILY:
          return await this.processAggregateDaily(data, job);

        case AnalyticsJobType.CLEANUP_OLD:
          return await this.processCleanupOld(data, job);

        case AnalyticsJobType.PROCESS_METRICS:
          return await this.processMetrics(data, job);

        case AnalyticsJobType.GENERATE_REPORT:
          return await this.processGenerateReport(data, job);

        default:
          throw new Error(`Unknown analytics job type: ${jobType}`);
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} (${jobType}) failed:`, error);
      throw error;
    }
  }

  /**
   * Get job status from Bull queue
   */
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

  /**
   * Remove job from Bull queue
   */
  protected async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Removed job ${jobId}`);
    }
  }

  /**
   * Schedule recurring analytics jobs
   */
  async scheduleRecurring(
    jobType: string,
    cronExpression: string,
    data: AnalyticsJobData
  ): Promise<string> {
    try {
      // Bull uses repeat options for cron-like functionality
      const job = await this.queue.add(jobType, data, {
        repeat: {
          cron: cronExpression,
          tz: process.env.TZ || 'UTC', // Use timezone from env or UTC
        },
        removeOnComplete: 10, // Keep last 10 completed recurring jobs
        removeOnFail: 5, // Keep last 5 failed recurring jobs
      });

      this.logger.log(
        `Scheduled recurring job ${jobType} with cron: ${cronExpression}`
      );
      return job.id.toString();
    } catch (error) {
      this.logger.error(`Failed to schedule recurring job ${jobType}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailed(jobType?: string): Promise<number> {
    try {
      const failedJobs = await this.queue.getFailed();
      let retriedCount = 0;

      for (const job of failedJobs) {
        // Filter by job type if specified
        if (jobType && job.name !== jobType) {
          continue;
        }

        // Check if job has attempts remaining
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
    } catch (error) {
      this.logger.error('Failed to retry jobs:', error);
      throw error;
    }
  }

  /**
   * Clean up completed jobs
   */
  async purgeCompleted(olderThanHours: number): Promise<number> {
    try {
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
      const completedJobs = await this.queue.getCompleted();
      let purgedCount = 0;

      for (const job of completedJobs) {
        // Check if job is older than cutoff
        const jobCompletedAt = job.finishedOn || job.processedOn;
        if (jobCompletedAt && jobCompletedAt < cutoffTime) {
          await job.remove();
          purgedCount++;
        }
      }

      // Also clean up old failed jobs
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
    } catch (error) {
      this.logger.error('Failed to purge completed jobs:', error);
      throw error;
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
        events: [], // Not used for aggregation
        metadata: {
          aggregationDate: date.toISOString().split('T')[0],
          scheduledAt: new Date().toISOString(),
        },
      },
      {
        priority: 5, // Higher priority for aggregation
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
        priority: 1, // Lower priority for cleanup
        ...options,
      }
    );
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

  // ===============================
  // Job Processing Methods
  // ===============================

  private async processSingleRecord(
    data: AnalyticsJobData,
    job: Job
  ): Promise<any> {
    const events = data.events;
    if (!events?.length) {
      throw new Error('No events to process');
    }

    const entities = events.map((event) =>
      this.eventsRepo.createEntity({
        storeId: event.storeId,
        productId: event.productId,
        userId: event.userId,
        eventType: event.eventType,
        value: event.value,
        meta: event.meta,
      })
    );

    await this.eventsRepo.insertMany(entities as any);

    this.logger.debug(
      `Job ${job.id}: Processed ${entities.length} analytics events`
    );

    return {
      success: true,
      processed: entities.length,
      jobId: job.id,
      processedAt: new Date().toISOString(),
    };
  }

  private async processBatchRecord(
    data: AnalyticsJobData,
    job: Job
  ): Promise<any> {
    const { events, batchId } = data;
    if (!events?.length) {
      throw new Error('No events in batch to process');
    }

    // Update job progress
    await job.progress(25);

    const entities = events.map((event) =>
      this.eventsRepo.createEntity({
        storeId: event.storeId,
        productId: event.productId,
        userId: event.userId,
        eventType: event.eventType,
        value: event.value,
        meta: event.meta,
      })
    );

    await job.progress(75);

    await this.eventsRepo.insertMany(entities as any);

    await job.progress(100);

    this.logger.debug(
      `Job ${job.id}: Processed batch ${batchId} with ${entities.length} events`
    );

    return {
      success: true,
      batchId,
      processed: entities.length,
      jobId: job.id,
      processedAt: new Date().toISOString(),
    };
  }

  private async processAggregateDaily(
    data: AnalyticsJobData,
    job: Job
  ): Promise<any> {
    const aggregationDate = data.metadata?.aggregationDate
      ? new Date(data.metadata.aggregationDate)
      : new Date();

    aggregationDate.setHours(0, 0, 0, 0);

    this.logger.debug(
      `Job ${job.id}: Processing daily aggregation for ${aggregationDate.toISOString()}`
    );

    // Update progress
    await job.progress(50);

    // Implementation for daily aggregation would go here
    // This could create summary tables, calculate metrics, etc.

    await job.progress(100);

    return {
      success: true,
      date: aggregationDate.toISOString(),
      type: 'daily_aggregation',
      jobId: job.id,
      processedAt: new Date().toISOString(),
    };
  }

  private async processCleanupOld(
    data: AnalyticsJobData,
    job: Job
  ): Promise<any> {
    const daysToKeep = data.metadata?.daysToKeep || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logger.debug(
      `Job ${job.id}: Cleaning up events older than ${cutoffDate.toISOString()}`
    );

    await job.progress(50);

    // Implementation for cleanup would go here
    // const deleted = await this.eventsRepo.delete({
    //   createdAt: LessThan(cutoffDate)
    // });

    await job.progress(100);

    return {
      success: true,
      cutoffDate: cutoffDate.toISOString(),
      type: 'cleanup',
      daysToKeep,
      jobId: job.id,
      processedAt: new Date().toISOString(),
    };
  }

  private async processMetrics(data: AnalyticsJobData, job: Job): Promise<any> {
    this.logger.debug(`Job ${job.id}: Processing metrics`);

    await job.progress(50);

    // Implementation for metrics processing would go here
    // This could calculate conversion rates, trending products, etc.

    await job.progress(100);

    return {
      success: true,
      type: 'metrics_processing',
      jobId: job.id,
      processedAt: new Date().toISOString(),
    };
  }

  private async processGenerateReport(
    data: AnalyticsJobData,
    job: Job
  ): Promise<any> {
    this.logger.debug(`Job ${job.id}: Generating analytics report`);

    await job.progress(25);

    // Implementation for report generation would go here

    await job.progress(100);

    return {
      success: true,
      type: 'report_generation',
      jobId: job.id,
      processedAt: new Date().toISOString(),
    };
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
      removeOnComplete: options.removeOnComplete || 100,
      removeOnFail: options.removeOnFail || 50,
      jobId: options.jobId,
    };
  }

  /**
   * Convenience method for backward compatibility
   */
  async close(): Promise<void> {
    try {
      await this.queue.close();
      this.logger.log('Analytics queue closed');
    } catch (error) {
      this.logger.error('Failed to close analytics queue:', error);
    }
  }
}
