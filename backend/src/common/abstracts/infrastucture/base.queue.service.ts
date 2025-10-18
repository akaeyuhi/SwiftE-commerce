import { Injectable, Logger } from '@nestjs/common';
import {
  QueueJob,
  QueueOptions,
} from 'src/common/interfaces/infrastructure/queue.interface';
import { Queue } from 'bull';

/**
 * BaseQueueService
 *
 * Abstract service for job queue management and processing.
 * Provides patterns for job scheduling, processing, retry logic, and monitoring.
 *
 * Subclasses must implement:
 * - `addJob`: Add job to the queue
 * - `processJob`: Handle job processing logic
 * - `getJobStatus`: Check status of a specific job
 * - `removeJob`: Remove job from queue
 *
 * Common functionality provided:
 * - `scheduleJob`: Add job with scheduling options
 * - `scheduleRecurring`: Set up recurring/cron jobs
 * - `bulkAdd`: Add multiple jobs efficiently
 * - `retryFailed`: Retry jobs that failed
 * - `purgeCompleted`: Clean up old completed jobs
 *
 * Generics:
 * - `JobData` — Type of data passed to jobs
 * - `JobResult` — Type of result returned by job processing
 */
@Injectable()
export abstract class BaseQueueService<JobData = any, JobResult = any> {
  /**
   * Name/identifier for this queue
   */
  protected abstract readonly queueName: string;
  protected readonly logger = new Logger(BaseQueueService.name);

  /**
   * Default options for jobs added to this queue
   */
  protected readonly defaultOptions: QueueOptions = {
    priority: 0,
    maxAttempts: 3,
    backoff: 'exponential',
    backoffDelay: 1000,
  };

  protected constructor(protected readonly queue: Queue) {}

  /**
   * Add a job to the queue.
   *
   * Core method for job scheduling that must be implemented by subclasses.
   * Should integrate with specific queue implementation (Bull, Agenda, etc.)
   *
   * @param jobType - type/name of the job to process
   * @param data - job payload data
   * @param options - job scheduling options
   * @returns Promise resolving to job ID or job instance
   */
  protected abstract addJob(
    jobType: string,
    data: JobData,
    options?: QueueOptions
  ): Promise<string | QueueJob<JobData>>;

  /**
   * Process a job.
   *
   * Contains the business logic for handling jobs of this queue type.
   * Called by the queue processor when jobs are ready for execution.
   *
   * @param jobType - type of job being processed
   * @param data - job data payload
   * @param job - full job object with metadata
   * @returns Promise resolving to job result
   * @throws Error if job processing fails
   */
  protected abstract processJob(
    jobType: string,
    data: JobData,
    job: QueueJob<JobData>
  ): Promise<JobResult>;

  /**
   * Get status and details of a specific job.
   *
   * @param jobId - identifier of the job to check
   * @returns Promise resolving to job details or null if not found
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
   * Remove a job from the queue.
   *
   * @param jobId - identifier of job to remove
   * @returns Promise resolving when job is removed
   */
  protected abstract removeJob(jobId: string): Promise<void>;

  /**
   * Schedule a job with options.
   *
   * Public interface for adding jobs with full option support.
   * Merges provided options with defaults.
   *
   * @param jobType - type of job to schedule
   * @param data - job data
   * @param options - scheduling options
   * @returns Promise resolving to job ID
   */
  async scheduleJob(
    jobType: string,
    data: JobData,
    options: QueueOptions = {}
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const result = await this.addJob(jobType, data, mergedOptions);
    return typeof result === 'string' ? result : result.id;
  }

  /**
   * Schedule a job for future execution.
   *
   * @param jobType - type of job to schedule
   * @param data - job data
   * @param scheduledFor - when to execute the job
   * @param options - additional options
   * @returns Promise resolving to job ID
   */
  async scheduleDelayed(
    jobType: string,
    data: JobData,
    scheduledFor: Date,
    options: Omit<QueueOptions, 'delay'> = {}
  ): Promise<string> {
    const delay = scheduledFor.getTime() - Date.now();
    return this.scheduleJob(jobType, data, { ...options, delay });
  }

  /**
   * Add multiple jobs in batch.
   *
   * Efficient bulk operation for adding many jobs at once.
   *
   * @param jobs - array of job definitions
   * @returns Promise resolving to array of job IDs
   */
  async bulkAdd(
    jobs: Array<{
      type: string;
      data: JobData;
      options?: QueueOptions;
    }>
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const jobDef of jobs) {
      const jobId = await this.scheduleJob(
        jobDef.type,
        jobDef.data,
        jobDef.options
      );
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Set up recurring job (cron-like scheduling).
   *
   * Override in subclasses to implement recurring job logic.
   * Default implementation throws - must be implemented for cron support.
   *
   * @param jobType - type of job to run
   * @param cronExpression - cron pattern (e.g., '0 0 * * *')
   * @param data - job data
   * @returns Promise resolving to recurring job ID
   */
  abstract scheduleRecurring(
    jobType: string,
    cronExpression: string,
    data: JobData
  ): Promise<string>;

  /**
   * Retry all failed jobs or specific job types.
   *
   * Override to implement retry logic based on queue backend.
   *
   * @param jobType - optional job type filter
   * @returns Promise resolving to number of jobs retried
   */
  abstract retryFailed(jobType?: string): Promise<number>;

  /**
   * Clean up completed jobs older than specified age.
   *
   * @param olderThanHours - remove jobs completed more than N hours ago
   * @returns Promise resolving to number of jobs removed
   */
  abstract purgeCompleted(olderThanHours: number): Promise<number>;

  /**
   * Get queue statistics.
   *
   * @returns Promise resolving to queue stats
   */
  async getStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total:
          waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
        total: 0,
      };
    }
  }
}
/**
 * Example usage:
 *
 * @Injectable()
 * export class EmailQueueService extends BaseQueueService<EmailJobData, void> {
 *   protected readonly queueName = 'email';
 *
 *   constructor(@InjectQueue('email') private queue: Queue) {
 *     super();
 *   }
 *
 *   protected async addJob(jobType: string, data: EmailJobData, options?: QueueOptions) {
 *     const job = await this.queue.add(jobType, data, {
 *       priority: options?.priority,
 *       delay: options?.delay,
 *       attempts: options?.maxAttempts
 *     });
 *     return job.id;
 *   }
 *
 *   protected async processJob(jobType: string, data: EmailJobData) {
 *     switch (jobType) {
 *       case 'send-welcome':
 *         await this.sendWelcomeEmail(data);
 *         break;
 *       case 'send-reminder':
 *         await this.sendReminderEmail(data);
 *         await this.sendReminderEmail(data);
 *         break;
 *       default:
 *         throw new Error(`Unknown job type: ${jobType}`);
 *     }
 *   }
 * }
 */
