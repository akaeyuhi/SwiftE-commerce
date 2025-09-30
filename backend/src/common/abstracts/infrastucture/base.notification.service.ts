import { Injectable } from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';
import {
  NotificationLog,
  NotificationPayload,
} from 'src/common/interfaces/infrastructure/notification.interface';
import {
  NotificationChannel,
  NotificationStatus,
} from 'src/common/enums/notification.enum';

/**
 * BaseNotificationService
 *
 * Abstract service for notification delivery across multiple channels.
 * Provides common patterns for sending, logging, retry logic, and batch operations.
 *
 * Subclasses must implement:
 * - `send`: Core delivery logic for the specific channel
 * - `validatePayload`: Payload validation before sending
 * - `createLog`: Persist notification attempt to audit log
 * - `updateLog`: Update log entry with delivery status
 *
 * Common helper methods provided:
 * - `notify`: Main entry point with validation, logging, and error handling
 * - `notifyBatch`: Bulk notification sending with rate limiting
 * - `scheduleNotification`: Queue notification for future delivery
 * - `retryFailed`: Retry mechanism for failed notifications
 *
 * Generics:
 * - `PayloadData` — Type of the data object within notification payload
 * - `LogEntity` — Type of the notification log entity (extends NotificationLog)
 */
@Injectable()
export abstract class BaseNotificationService<
  PayloadData = any,
  LogEntity extends NotificationLog = NotificationLog,
> {
  /**
   * Channel this service handles (email, sms, push, etc.)
   */
  protected abstract readonly channel: NotificationChannel;

  /**
   * Maximum retry attempts for failed notifications
   */
  protected readonly maxRetries: number = 3;

  /**
   * Delay between batch items (ms) to avoid rate limiting
   */
  protected readonly batchDelay: number = 100;

  /**
   * Send a single notification.
   *
   * Core delivery method that must be implemented by subclasses.
   * Should contain channel-specific logic (SMTP, SMS API, push service, etc.)
   *
   * @param payload - notification data and recipient info
   * @returns Promise resolving to delivery metadata or void
   * @throws Error if delivery fails
   */
  protected abstract send(
    payload: NotificationPayload<PayloadData>
  ): Promise<any>;

  /**
   * Validate notification payload before sending.
   *
   * Implement channel-specific validation (email format, phone number, etc.)
   *
   * @param payload - notification payload to validate
   * @throws Error if payload is invalid
   */
  protected abstract validatePayload(
    payload: NotificationPayload<PayloadData>
  ): void;

  /**
   * Create a log entry for the notification attempt.
   *
   * @param payload - notification payload being sent
   * @returns Promise resolving to created log entity
   */
  protected abstract createLog(
    payload: NotificationPayload<PayloadData>
  ): Promise<LogEntity>;

  /**
   * Update log entry with delivery status and metadata.
   *
   * @param logId - identifier of the log entry to update
   * @param status - new status (sent, failed, delivered, etc.)
   * @param metadata - additional delivery metadata
   * @param errorMessage - error message if failed
   */
  protected abstract updateLog(
    logId: string,
    status: NotificationStatus,
    metadata?: Record<string, any>,
    errorMessage?: string
  ): Promise<void>;

  /**
   * Send notification with full error handling and logging.
   *
   * Main entry point that:
   * 1. Validates the payload
   * 2. Creates audit log entry
   * 3. Attempts delivery
   * 4. Updates log with result
   * 5. Handles retries on failure
   *
   * @param payload - notification to send
   * @returns Promise resolving when notification is processed
   */
  async notify(payload: NotificationPayload<PayloadData>): Promise<void> {
    // Validate payload
    this.validatePayload(payload);

    // Create log entry
    const log = await this.createLog(payload);

    try {
      // Attempt delivery
      const result = await this.send(payload);

      // Update log with success
      await this.updateLog(log.id, NotificationStatus.SENT, result);
    } catch (error) {
      // Update log with failure
      await this.updateLog(
        log.id,
        NotificationStatus.FAILED,
        undefined,
        error.message
      );

      // Retry if under limit
      if (log.retryCount < this.maxRetries) {
        await this.scheduleRetry(payload, log.retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Send notifications in batches with rate limiting.
   *
   * Processes notifications sequentially with delays to avoid overwhelming
   * external services or hitting rate limits.
   *
   * @param payloads - array of notifications to send
   * @param batchSize - number of notifications per batch (default: 10)
   * @returns Promise resolving to array of results (success/failure per item)
   */
  async notifyBatch(
    payloads: NotificationPayload<PayloadData>[],
    batchSize: number = 10
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results: Array<{ success: boolean; error?: string }> = [];

    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);

      const batchPromises = batch.map(async (payload) => {
        try {
          await this.notify(payload);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(
        ...batchResults.map((r) =>
          r.status === 'fulfilled'
            ? r.value
            : { success: false, error: 'Unknown error' }
        )
      );

      // Rate limiting delay between batches
      if (i + batchSize < payloads.length) {
        await this.delay(this.batchDelay);
      }
    }

    return results;
  }

  /**
   * Schedule notification for future delivery.
   *
   * Override in subclasses to integrate with job queue systems.
   * Default implementation throws error - must be implemented for scheduling.
   *
   * @param payload - notification to schedule
   * @param scheduledFor - when to send the notification
   * @returns Promise resolving to scheduled job/task ID
   */
  abstract scheduleNotification(
    payload: NotificationPayload<PayloadData>,
    scheduledFor: Date
  ): Promise<string>;

  /**
   * Retry a failed notification after exponential backoff.
   *
   * @param payload - original notification payload
   * @param retryCount - current retry attempt number
   */
  protected async scheduleRetry(
    payload: NotificationPayload<PayloadData>,
    retryCount: number
  ): Promise<void> {
    const backoffMs = Math.pow(2, retryCount) * 1000; // Exponential backoff

    setTimeout(() => {
      this.notify({
        ...payload,
        metadata: {
          ...payload.metadata,
          retryCount,
          originalFailure: true,
        },
      });
    }, backoffMs);
  }

  /**
   * Utility method for delays in batch processing.
   *
   * @param ms - milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Example usage:
 *
 * @Injectable()
 * export class EmailNotificationService extends BaseNotificationService<EmailData, EmailLog> {
 *   protected readonly channel = NotificationChannel.EMAIL;
 *
 *   constructor(private mailer: MailerService, private logRepo: EmailLogRepository) {
 *     super();
 *   }
 *
 *   protected async send(payload: NotificationPayload<EmailData>) {
 *     return await this.mailer.sendMail({
 *       to: payload.recipient,
 *       subject: payload.data.subject,
 *       html: payload.data.body
 *     });
 *   }
 *
 *   protected validatePayload(payload: NotificationPayload<EmailData>) {
 *     if (!isEmail(payload.recipient)) {
 *       throw new Error('Invalid email address');
 *     }
 *   }
 *
 *   protected async createLog(payload: NotificationPayload<EmailData>) {
 *     return await this.logRepo.createEntity({
 *       recipient: payload.recipient,
 *       channel: this.channel,
 *       type: payload.type,
 *       status: NotificationStatus.PENDING
 *     });
 *   }
 * }
 */
