import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { EmailService } from '../email.service';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';
import { EmailJobData, EmailJobType } from '../interfaces/email.interface';
import {
  QueueJob,
  QueueOptions,
} from 'src/common/interfaces/infrastructure/queue.interface';
import { EmailPriority } from 'src/modules/email/enums/email.enum';

/**
 * EmailQueueService
 *
 * Queue-based email processing service extending BaseQueueService.
 * Handles reliable email delivery with retry logic, priority processing,
 * and comprehensive error handling.
 */
@Injectable()
export class EmailQueueService extends BaseQueueService<EmailJobData, any> {
  protected readonly queueName = 'email';
  protected readonly logger = new Logger(EmailQueueService.name);

  protected readonly defaultOptions: QueueOptions = {
    priority: EmailPriority.NORMAL,
    maxAttempts: 3,
    backoff: 'exponential',
    backoffDelay: 5000, // 5 seconds base delay
  };

  constructor(
    @InjectQueue('email') protected readonly queue: Queue,
    private readonly emailService: EmailService
  ) {
    super(queue);
  }

  protected async addJob(
    jobType: string,
    data: EmailJobData,
    options?: QueueOptions
  ): Promise<string> {
    const bullOptions: JobOptions = this.convertToBullOptions(options);
    const job = await this.queue.add(jobType, data, bullOptions);
    return job.id.toString();
  }

  protected async processJob(
    jobType: string,
    data: EmailJobData,
    job: QueueJob<EmailJobData>
  ): Promise<any> {
    this.logger.debug(`Processing email job ${job.id}: ${jobType}`);

    try {
      const result = await this.emailService.sendEmail(
        data.emailData,
        data.type as EmailJobType
      );

      this.logger.log(
        `Email job ${job.id} completed successfully: ${result.messageId}`
      );

      return {
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        sentAt: result.sentAt,
        jobId: job.id.toString(),
      };
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error);
      throw error;
    }
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
    }
  }

  async scheduleRecurring(
    jobType: string,
    cronExpression: string,
    data: EmailJobData
  ): Promise<string> {
    const job = await this.queue.add(jobType, data, {
      repeat: {
        cron: cronExpression,
        tz: process.env.TZ || 'UTC',
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(
      `Scheduled recurring email job ${jobType}: ${cronExpression}`
    );
    return job.id.toString();
  }

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
      }
    }

    this.logger.log(`Retried ${retriedCount} failed email jobs`);
    return retriedCount;
  }

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

    this.logger.log(`Purged ${purgedCount} completed email jobs`);
    return purgedCount;
  }

  // ===============================
  // Public Email Queue Methods
  // ===============================

  async sendUserConfirmation(
    userEmail: string,
    userName: string,
    confirmationUrl: string,
    storeName: string,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.USER_CONFIRMATION,
      {
        type: EmailJobType.USER_CONFIRMATION,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '', // Will be set by template
          html: '', // Will be set by template
          templateId: 'user_confirmation',
          templateData: {
            userName,
            storeName,
            confirmationUrl,
            expirationHours: 24,
          },
          priority: EmailPriority.HIGH,
          tags: ['user-confirmation', 'auth'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    storeUrl: string,
    storeName: string,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.WELCOME,
      {
        type: EmailJobType.WELCOME,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '', // Will be set by template
          html: '', // Will be set by template
          templateId: 'welcome',
          templateData: {
            userName,
            storeName,
            storeUrl,
          },
          priority: EmailPriority.NORMAL,
          tags: ['welcome', 'onboarding'],
        },
      },
      options
    );
  }

  async sendStockAlert(
    userEmail: string,
    userName: string,
    productData: {
      name: string;
      price: string;
      stockQuantity: number;
      url: string;
      image?: string;
      description?: string;
    },
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.STOCK_ALERT,
      {
        type: EmailJobType.STOCK_ALERT,
        emailData: {
          to: [{ email: userEmail, name: userName }],
          subject: '', // Will be set by template
          html: '', // Will be set by template
          templateId: 'stock_alert',
          templateData: {
            userName,
            productName: productData.name,
            productPrice: productData.price,
            stockQuantity: productData.stockQuantity,
            productUrl: productData.url,
            productImage: productData.image,
            productDescription: productData.description,
          },
          priority: EmailPriority.HIGH,
          tags: ['stock-alert', 'notification'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  async sendLowStockWarning(
    storeOwnerEmail: string,
    storeOwnerName: string,
    productData: {
      name: string;
      sku: string;
      category: string;
      currentStock: number;
      threshold: number;
      recentSales: number;
      estimatedDays: number;
    },
    manageInventoryUrl: string,
    options?: QueueOptions
  ): Promise<string> {
    return this.scheduleJob(
      EmailJobType.LOW_STOCK_WARNING,
      {
        type: EmailJobType.LOW_STOCK_WARNING,
        emailData: {
          to: [{ email: storeOwnerEmail, name: storeOwnerName }],
          subject: '', // Will be set by template
          html: '', // Will be set by template
          templateId: 'low_stock_warning',
          templateData: {
            storeOwnerName,
            productName: productData.name,
            productSku: productData.sku,
            productCategory: productData.category,
            currentStock: productData.currentStock,
            stockThreshold: productData.threshold,
            recentSales: productData.recentSales,
            estimatedDays: productData.estimatedDays,
            manageInventoryUrl,
          },
          priority: EmailPriority.HIGH,
          tags: ['low-stock', 'inventory', 'warning'],
        },
      },
      { priority: EmailPriority.HIGH, ...options }
    );
  }

  private convertToBullOptions(options?: QueueOptions): JobOptions {
    if (!options) return {};

    return {
      priority: options.priority || EmailPriority.NORMAL,
      delay: options.delay,
      attempts: options.maxAttempts,
      backoff:
        options.backoff === 'exponential'
          ? {
              type: 'exponential',
              delay: options.backoffDelay || 5000,
            }
          : options.backoffDelay || 5000,
      removeOnComplete: options.removeOnComplete || 100,
      removeOnFail: options.removeOnFail || 50,
      jobId: options.jobId,
    };
  }
}
