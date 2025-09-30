import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { RecordEventDto } from '../dto/record-event.dto';
import { AnalyticsEventType } from '../entities/analytics-event.entity';
import { AnalyticsEventRepository } from '../repositories/analytics-event.repository';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';
import { QueueOptions } from 'src/common/interfaces/infrastructure/queue.interface';

export interface AnalyticsJobData {
  events: RecordEventDto[];
  batchId?: string;
  priority?: number;
}

export enum AnalyticsJobType {
  RECORD_SINGLE = 'record_single',
  RECORD_BATCH = 'record_batch',
  AGGREGATE_DAILY = 'aggregate_daily',
  CLEANUP_OLD = 'cleanup_old',
}

/**
 * AnalyticsQueueService
 *
 * Extends BaseQueueService to provide analytics-specific job processing.
 * Handles event recording, batch processing, aggregation, and cleanup tasks.
 */
@Injectable()
export class AnalyticsQueueService extends BaseQueueService<AnalyticsJobData> {
  protected readonly queueName = 'analytics';
  private readonly logger = new Logger(AnalyticsQueueService.name);

  protected readonly defaultOptions: QueueOptions = {
    priority: 0,
    maxAttempts: 3,
    backoff: 'exponential',
    backoffDelay: 2000,
  };

  constructor(
    @InjectQueue('analytics') private readonly queue: Queue,
    private readonly eventsRepo: AnalyticsEventRepository
  ) {
    super();
  }

  /**
   * Add job to Bull queue
   */
  protected async addJob(
    jobType: string,
    data: AnalyticsJobData,
    options?: QueueOptions
  ): Promise<string> {
    const bullOptions: JobOptions = {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.maxAttempts || 3,
      backoff: {
        type: options?.backoff || 'exponential',
        delay: options?.backoffDelay || 2000,
      },
      removeOnComplete: { age: 60 * 60, count: 1000 },
      removeOnFail: { age: 60 * 60 * 24, count: 1000 },
    };

    const job = await this.queue.add(jobType, data, bullOptions);
    return job.id.toString();
  }

  /**
   * Process analytics jobs
   */
  protected async processJob(
    jobType: string,
    data: AnalyticsJobData
  ): Promise<any> {
    switch (jobType) {
      case AnalyticsJobType.RECORD_SINGLE:
        return this.processSingleRecord(data);

      case AnalyticsJobType.RECORD_BATCH:
        return this.processBatchRecord(data);

      case AnalyticsJobType.AGGREGATE_DAILY:
        return this.processAggregateDaily();

      case AnalyticsJobType.CLEANUP_OLD:
        return this.processCleanupOld();

      default:
        throw new Error(`Unknown analytics job type: ${jobType}`);
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
      data: job.data,
      priority: job.opts.priority || 0,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
      delay: job.opts.delay || 0,
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedAt: job.failedReason ? new Date(job.failedReason) : undefined,
      error: job.failedReason,
    };
  }

  /**
   * Remove job from Bull queue
   */
  protected async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Override to get Bull queue stats
   */
  async getStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
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
    if (!events || events.length === 0) {
      throw new Error('Cannot add empty batch');
    }

    return this.scheduleJob(
      AnalyticsJobType.RECORD_BATCH,
      {
        events,
        batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      options
    );
  }

  /**
   * Schedule daily aggregation job
   */
  async scheduleDailyAggregation(): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.AGGREGATE_DAILY,
      {
        events: [], // Not used for aggregation
        priority: 5, // Higher priority for aggregation
      },
      {
        priority: 5,
        delay: 0,
      }
    );
  }

  /**
   * Schedule cleanup of old events
   */
  async scheduleCleanup(): Promise<string> {
    return this.scheduleJob(
      AnalyticsJobType.CLEANUP_OLD,
      {
        events: [],
        priority: 1, // Lower priority for cleanup
      },
      {
        priority: 1,
      }
    );
  }

  // ===============================
  // Convenience Event Methods
  // ===============================

  async recordView(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ): Promise<string> {
    const event: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.VIEW,
      invokedOn: productId ? 'product' : 'store',
      meta,
    };
    return this.addEvent(event);
  }

  async recordLike(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ): Promise<string> {
    const event: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.LIKE,
      invokedOn: productId ? 'product' : 'store',
      meta,
    };
    return this.addEvent(event);
  }

  async recordAddToCart(
    storeId: string,
    productId: string,
    userId?: string,
    quantity = 1,
    meta?: any
  ): Promise<string> {
    const event: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.ADD_TO_CART,
      invokedOn: 'product',
      value: quantity,
      meta,
    };
    return this.addEvent(event);
  }

  async recordPurchase(
    storeId: string,
    productId: string,
    userId: string,
    amount = 0,
    meta?: any
  ): Promise<string> {
    const event: RecordEventDto = {
      storeId: storeId ?? null,
      productId: productId ?? null,
      userId: userId ?? null,
      eventType: AnalyticsEventType.PURCHASE,
      invokedOn: 'product',
      value: amount,
      meta: meta ?? null,
    };
    return this.addEvent(event);
  }

  async recordClick(
    storeId?: string,
    productId?: string,
    userId?: string,
    meta?: any
  ): Promise<string> {
    const event: RecordEventDto = {
      storeId,
      productId,
      userId,
      eventType: AnalyticsEventType.CLICK,
      invokedOn: productId ? 'product' : 'store',
      meta,
    };
    return this.addEvent(event);
  }

  // ===============================
  // Job Processing Methods
  // ===============================

  private async processSingleRecord(data: AnalyticsJobData) {
    const events = data.events;
    if (!events || events.length === 0) {
      throw new Error('No events to process');
    }

    const entities = events.map((event: RecordEventDto) =>
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

    this.logger.debug(`Processed ${entities.length} analytics events`);
    return { success: true, processed: entities.length };
  }

  private async processBatchRecord(data: AnalyticsJobData) {
    const events = data.events;
    if (!events || events.length === 0) {
      throw new Error('No events in batch to process');
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
      `Processed batch ${data.batchId} with ${entities.length} events`
    );
    return { success: true, batchId: data.batchId, processed: entities.length };
  }

  private async processAggregateDaily() {
    // Implement daily aggregation logic
    // This could create summary tables, calculate metrics, etc.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.logger.debug(
      `Processing daily aggregation for ${today.toISOString()}`
    );

    // Example: Could aggregate views, purchases, etc. by store/product
    // await this.createDailyAggregates(today);

    return { success: true, date: today, type: 'daily_aggregation' };
  }

  private async processCleanupOld() {
    // Implement cleanup logic for old events
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

    this.logger.debug(
      `Cleaning up events older than ${cutoffDate.toISOString()}`
    );

    // Example cleanup query
    // const deleted = await this.eventsRepo.delete({
    //   createdAt: LessThan(cutoffDate)
    // });

    return { success: true, cutoffDate, type: 'cleanup' };
  }
}
