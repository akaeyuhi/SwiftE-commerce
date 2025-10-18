import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { EmailPriority } from 'src/common/enums/email.enum';
import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';
import { BaseNotificationService } from 'src/common/abstracts/infrastucture/base.notification.service';
import {
  NewsNotificationData,
  NewsNotificationPayload,
} from 'src/common/interfaces/notifications/news-notification.types';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { NewsNotificationLog } from 'src/entities/infrastructure/notifications/news-notification-log.entity';

/**
 * NewsNotificationService
 *
 * Handles delivery of news-related notifications.
 * Extends BaseNotificationService to inherit retry logic, batch operations, and logging.
 *
 * Primary channel: EMAIL
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Audit logging for compliance
 * - Batch notification support for multiple followers
 * - Unsubscribe link generation
 */
@Injectable()
export class NewsNotificationService extends BaseNotificationService<
  NewsNotificationData,
  NewsNotificationLog
> {
  protected readonly channel = NotificationChannel.EMAIL;
  protected readonly logger = new Logger(NewsNotificationService.name);

  // Retry settings for news notifications
  protected readonly maxRetries = 3; // Lower than orders since less critical
  protected readonly batchDelay = 300; // Higher delay for bulk sends

  constructor(
    @InjectRepository(NewsNotificationLog)
    private readonly notificationLogRepo: Repository<NewsNotificationLog>,
    private readonly emailQueue: EmailQueueService
  ) {
    super();
  }

  /**
   * Send notification via email queue.
   */
  protected async send(
    payload: NotificationPayload<NewsNotificationData>
  ): Promise<any> {
    const data = payload.data;

    return await this.emailQueue.sendNewsNotification(
      payload.recipient,
      payload.recipientName || payload.recipient,
      {
        newsId: data.newsId,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        authorName: data.authorName,
        publishedAt: data.publishedAt,
        newsUrl: data.newsUrl,
        coverImageUrl: data.coverImageUrl,
        category: data.category,
        storeName: data.storeName,
        unsubscribeUrl: data.unsubscribeUrl,
      },
      { priority: EmailPriority.NORMAL }
    );
  }

  /**
   * Validate notification payload before sending.
   */
  protected validatePayload(
    payload: NotificationPayload<NewsNotificationData>
  ): void {
    // Validate recipient email
    if (!payload.recipient || !this.isValidEmail(payload.recipient)) {
      throw new Error(`Invalid email address: ${payload.recipient}`);
    }

    // Validate notification type
    if (payload.notificationType !== NotificationType.NEWS_PUBLISHED) {
      throw new Error(`Invalid notification type: ${payload.notificationType}`);
    }

    // Validate data payload
    if (!payload.data) {
      throw new Error('Notification data is required');
    }

    const data = payload.data;

    // Required fields
    if (!data.newsId || !data.storeId || !data.title) {
      throw new Error('Missing required fields: newsId, storeId, title');
    }
  }

  /**
   * Create audit log entry for notification attempt.
   */
  protected async createLog(
    payload: NotificationPayload<NewsNotificationData>
  ): Promise<NewsNotificationLog> {
    const log = this.notificationLogRepo.create({
      storeId: payload.data.storeId,
      newsId: payload.data.newsId,
      userId: payload.metadata?.userId || null,
      recipient: payload.recipient,
      channel: this.channel,
      notificationType: payload.notificationType,
      status: NotificationStatus.PENDING,
      payload: payload.data,
      metadata: payload.metadata || {},
      retryCount: 0,
    });

    return await this.notificationLogRepo.save(log);
  }

  /**
   * Update notification log with delivery status.
   */
  protected async updateLog(
    logId: string,
    status: NotificationStatus,
    metadata?: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (metadata) {
      updateData.metadata = metadata;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (status === NotificationStatus.SENT) {
      updateData.sentAt = new Date();
    }

    if (status === NotificationStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    await this.notificationLogRepo.update(logId, updateData);
  }

  /**
   * Schedule notification for future delivery.
   */
  async scheduleNotification(
    payload: NotificationPayload<NewsNotificationData>,
    scheduledFor: Date
  ): Promise<string> {
    this.validatePayload(payload);

    const log = await this.createLog(payload);

    try {
      const delay = scheduledFor.getTime() - Date.now();

      await this.updateLog(log.id, NotificationStatus.PENDING, {
        scheduledFor: scheduledFor.toISOString(),
        scheduledDelay: delay,
      });

      this.logger.log(
        `Scheduled news notification for ${payload.recipient} ` +
          `at ${scheduledFor.toISOString()}`
      );

      return log.id;
    } catch (error) {
      await this.updateLog(
        log.id,
        NotificationStatus.FAILED,
        undefined,
        error.message
      );
      throw error;
    }
  }

  /**
   * Send news published notification to a single recipient.
   */
  async notifyNewsPublished(
    recipient: string,
    recipientName: string,
    data: NewsNotificationData,
    userId?: string
  ): Promise<void> {
    const payload: NewsNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.NEWS_PUBLISHED,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        userId,
      },
    };

    return this.notify(payload);
  }

  /**
   * Send news notifications to multiple followers (batch operation).
   *
   * Uses inherited notifyBatch method from BaseNotificationService.
   */
  async notifyFollowers(
    followers: Array<{ email: string; name: string; userId?: string }>,
    newsData: NewsNotificationData
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const payloads: NewsNotificationPayload[] = followers.map((follower) => ({
      recipient: follower.email,
      recipientName: follower.name,
      notificationType: NotificationType.NEWS_PUBLISHED,
      data: {
        ...newsData,
        unsubscribeUrl: this.generateUnsubscribeUrl(
          newsData.storeId,
          follower.userId || follower.email
        ),
      },
      metadata: {
        sentAt: new Date().toISOString(),
        userId: follower.userId,
      },
    }));

    this.logger.log(
      `Sending news notification "${newsData.title}" to ${followers.length} followers`
    );

    return this.notifyBatch(payloads);
  }

  /**
   * Get notification statistics for a news post.
   */
  async getNewsNotificationStats(newsId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    const logs = await this.notificationLogRepo.find({
      where: { newsId },
    });

    return {
      total: logs.length,
      sent: logs.filter((l) => l.status === NotificationStatus.SENT).length,
      failed: logs.filter((l) => l.status === NotificationStatus.FAILED).length,
      pending: logs.filter((l) => l.status === NotificationStatus.PENDING)
        .length,
    };
  }

  /**
   * Get notification statistics for a store.
   */
  async getStoreNotificationStats(
    storeId: string,
    since: Date
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    uniqueRecipients: number;
  }> {
    const logs = await this.notificationLogRepo.find({
      where: {
        storeId,
        createdAt: MoreThanOrEqual(since),
      },
    });

    const uniqueRecipients = new Set(logs.map((l) => l.recipient)).size;

    return {
      total: logs.length,
      sent: logs.filter((l) => l.status === NotificationStatus.SENT).length,
      failed: logs.filter((l) => l.status === NotificationStatus.FAILED).length,
      pending: logs.filter((l) => l.status === NotificationStatus.PENDING)
        .length,
      uniqueRecipients,
    };
  }

  /**
   * Generate unsubscribe URL for recipient.
   */
  private generateUnsubscribeUrl(
    storeId: string,
    userIdOrEmail: string
  ): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
    // You can implement token-based unsubscribe for security
    return `${baseUrl}/stores/${storeId}/unsubscribe?user=${encodeURIComponent(userIdOrEmail)}`;
  }

  /**
   * Email validation helper.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
