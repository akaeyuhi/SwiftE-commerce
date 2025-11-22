import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { EmailJobData } from 'src/common/interfaces/infrastructure/email.interface';
import { EmailJobType } from 'src/common/enums/email.enum';
import { EmailModule } from 'src/modules/email/email.module';
import { EmailService } from 'src/modules/email/email.service';

/**
 * EmailQueueProcessor
 *
 * Handles actual email sending with lazy-loaded EmailService.
 * Uses ModuleRef to dynamically load EmailService only when needed.
 *
 */
@Injectable()
@Processor('email')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly lazyModuleLoader: LazyModuleLoader) {}

  @Process(EmailJobType.USER_CONFIRMATION)
  async handleUserConfirmation(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.USER_CONFIRMATION);
  }

  @Process(EmailJobType.WELCOME)
  async handleWelcome(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.WELCOME);
  }

  @Process(EmailJobType.PASSWORD_RESET)
  async handlePasswordReset(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.PASSWORD_RESET);
  }

  @Process(EmailJobType.ROLE_CONFIRMATION)
  async handleRoleConfirmation(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.ROLE_CONFIRMATION);
  }

  @Process(EmailJobType.ORDER_CONFIRMATION)
  async handleOrderConfirmation(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.ORDER_CONFIRMATION);
  }

  @Process(EmailJobType.STOCK_ALERT)
  async handleStockAlert(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.STOCK_ALERT);
  }

  @Process(EmailJobType.LOW_STOCK_WARNING)
  async handleLowStockWarning(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.LOW_STOCK_WARNING);
  }

  @Process(EmailJobType.NEWSLETTER)
  async handleNewsletter(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.NEWSLETTER);
  }

  @Process(EmailJobType.NEWS_PUBLISHED)
  async handleStoreNews(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.NEWS_PUBLISHED);
  }

  @Process(EmailJobType.MARKETING)
  async handleMarketing(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.MARKETING);
  }

  @Process(EmailJobType.NOTIFICATION)
  async handleNotification(job: Job<EmailJobData>) {
    return this.processEmailJob(job, EmailJobType.NOTIFICATION);
  }

  /**
   * Generic email job processor
   */
  private async processEmailJob(
    job: Job<EmailJobData>,
    jobType: EmailJobType
  ): Promise<any> {
    try {
      this.logger.debug(`Processing email job ${job.id}: ${jobType}`);

      await job.progress(10);

      // Lazy load EmailService
      const emailService = await this.getEmailService();

      await job.progress(30);

      // Send email using EmailService
      const result = await emailService.sendEmail(
        job.data.emailData,
        job.data.type
      );

      await job.progress(100);

      this.logger.log(
        `Email job ${job.id} completed successfully: ${result.messageId}`
      );

      return {
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        sentAt: result.sentAt,
        jobId: job.id.toString(),
        jobType,
      };
    } catch (error) {
      this.logger.error(`Email job ${job.id} (${jobType}) failed:`, error);

      throw new Error(
        `Email sending failed: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Lazy load EmailService
   */
  private async getEmailService() {
    try {
      const moduleRef = await this.lazyModuleLoader.load(() => EmailModule);
      return moduleRef.get(EmailService, { strict: false });
    } catch (error) {
      this.logger.error('Failed to load EmailService:', error);
      throw new Error(
        'EmailService not available. Make sure EmailModule is loaded.'
      );
    }
  }

  /**
   * Optional: Handle failed jobs
   */
  @Process('failed')
  async handleFailedJob(job: Job<EmailJobData>) {
    this.logger.warn(
      `Handling failed email job ${job.id}: ${job.failedReason}`
    );

    return {
      jobId: job.id.toString(),
      status: 'failed',
      reason: job.failedReason,
      attempts: job.attemptsMade,
    };
  }
}
