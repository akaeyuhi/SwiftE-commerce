import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import {
  AnalyticsQueueService,
  AnalyticsJobType,
  AnalyticsJobData,
} from './analytics-queue.service';

/**
 * AnalyticsQueueProcessor
 *
 * Bull processor that delegates to AnalyticsQueueService.processJob()
 * This maintains separation of concerns - processor handles Bull integration,
 * service handles business logic.
 */
@Injectable()
@Processor('analytics')
export class AnalyticsQueueProcessor {
  private readonly logger = new Logger(AnalyticsQueueProcessor.name);

  constructor(private readonly analyticsQueue: AnalyticsQueueService) {}

  @Process(AnalyticsJobType.RECORD_SINGLE)
  async handleRecordSingle(job: Job<AnalyticsJobData>) {
    return this.processJob(job, AnalyticsJobType.RECORD_SINGLE);
  }

  @Process(AnalyticsJobType.RECORD_BATCH)
  async handleRecordBatch(job: Job<AnalyticsJobData>) {
    return this.processJob(job, AnalyticsJobType.RECORD_BATCH);
  }

  @Process(AnalyticsJobType.AGGREGATE_DAILY)
  async handleAggregateDaily(job: Job<AnalyticsJobData>) {
    return this.processJob(job, AnalyticsJobType.AGGREGATE_DAILY);
  }

  @Process(AnalyticsJobType.CLEANUP_OLD)
  async handleCleanupOld(job: Job<AnalyticsJobData>) {
    return this.processJob(job, AnalyticsJobType.CLEANUP_OLD);
  }

  /**
   * Legacy processor for backward compatibility
   */
  @Process('record')
  async handleLegacyRecord(job: Job<any>) {
    try {
      const payload = job.data;
      const events = Array.isArray(payload) ? payload : [payload];

      // Convert to new format and delegate
      const jobData: AnalyticsJobData = { events };
      return await this.analyticsQueue['processSingleRecord'](jobData, job);
    } catch (error) {
      this.logger.error(`Legacy record job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Common job processing wrapper
   */
  private async processJob(job: Job<AnalyticsJobData>, jobType: string) {
    try {
      this.logger.debug(`Processing ${jobType} job ${job.id}`);

      const result = await this.analyticsQueue['processJob'](
        jobType,
        job.data,
        job
      );

      this.logger.debug(`Completed ${jobType} job ${job.id}:`, result);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} (${jobType}) failed:`, error);
      throw error;
    }
  }
}
