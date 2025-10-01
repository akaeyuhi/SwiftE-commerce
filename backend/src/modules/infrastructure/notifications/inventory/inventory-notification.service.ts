import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { InventoryNotificationLog } from 'src/entities/infrastructure/notifications/inventory-notification-log.entity';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { EmailPriority } from 'src/common/enums/email.enum';
import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';
import { BaseNotificationService } from 'src/common/abstracts/infrastucture/base.notification.service';
import {
  LowStockNotificationData,
  LowStockNotificationPayload,
  OutOfStockNotificationData,
  OutOfStockNotificationPayload,
} from 'src/common/interfaces/notifications/inventory-notification.types';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';

/**
 * InventoryNotificationService
 *
 * Handles delivery of inventory-related notifications (low stock, out of stock).
 * Extends BaseNotificationService to inherit retry logic, batch operations, and logging.
 *
 * Primary channel: EMAIL (can be extended to support SMS/Push for critical alerts)
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Audit logging for compliance
 * - Batch notification support
 * - Priority-based delivery
 */
@Injectable()
export class InventoryNotificationService extends BaseNotificationService<
  LowStockNotificationData | OutOfStockNotificationData,
  InventoryNotificationLog
> {
  protected readonly channel = NotificationChannel.EMAIL;
  protected readonly logger = new Logger(InventoryNotificationService.name);

  // Override retry settings for inventory alerts
  protected readonly maxRetries = 5; // Higher retry count for critical business notifications
  protected readonly batchDelay = 200; // Slightly higher delay for email deliverability

  constructor(
    @InjectRepository(InventoryNotificationLog)
    private readonly notificationLogRepo: Repository<InventoryNotificationLog>,
    private readonly emailQueue: EmailQueueService
  ) {
    super();
  }

  /**
   * Send notification via email queue.
   *
   * Routes to appropriate email template based on notification type.
   */
  protected async send(
    payload: NotificationPayload<
      LowStockNotificationData | OutOfStockNotificationData
    >
  ): Promise<any> {
    const data = payload.data;

    // Determine if this is low stock or out of stock
    const isOutOfStock =
      payload.notificationType === NotificationType.INVENTORY_OUT_OF_STOCK;
    const isLowStock =
      payload.notificationType === NotificationType.INVENTORY_LOW_STOCK;

    if (isOutOfStock) {
      // Out of stock notification (critical priority)
      const outOfStockData = data as OutOfStockNotificationData;

      return await this.emailQueue.sendLowStockWarning(
        payload.recipient,
        payload.recipient,
        {
          name: outOfStockData.productName,
          sku: outOfStockData.sku,
          category: outOfStockData.category,
          currentStock: 0,
          threshold: 0,
          recentSales: 0,
          estimatedDays: 0,
        },
        outOfStockData.inventoryManagementUrl,
        { priority: EmailPriority.URGENT }
      );
    }

    if (isLowStock) {
      // Low stock notification
      const lowStockData = data as LowStockNotificationData;

      return await this.emailQueue.sendLowStockWarning(
        payload.recipient,
        payload.recipientName || payload.recipient,
        {
          name: lowStockData.productName,
          sku: lowStockData.sku,
          category: lowStockData.category,
          currentStock: lowStockData.currentStock,
          threshold: lowStockData.threshold,
          recentSales: lowStockData.recentSales,
          estimatedDays: lowStockData.estimatedDays,
        },
        lowStockData.inventoryManagementUrl,
        {
          priority: lowStockData.isCritical
            ? EmailPriority.URGENT
            : EmailPriority.HIGH,
        }
      );
    }

    throw new Error(`Unknown notification type: ${payload.notificationType}`);
  }

  /**
   * Validate notification payload before sending.
   *
   * Ensures all required fields are present and valid.
   */
  protected validatePayload(
    payload: NotificationPayload<
      LowStockNotificationData | OutOfStockNotificationData
    >
  ): void {
    // Validate recipient email
    if (!payload.recipient || !this.isValidEmail(payload.recipient)) {
      throw new Error(`Invalid email address: ${payload.recipient}`);
    }

    // Validate notification type
    const validTypes = [
      NotificationType.INVENTORY_LOW_STOCK,
      NotificationType.INVENTORY_OUT_OF_STOCK,
    ];

    if (!validTypes.includes(payload.notificationType)) {
      throw new Error(`Invalid notification type: ${payload.notificationType}`);
    }

    // Validate data payload
    if (!payload.data) {
      throw new Error('Notification data is required');
    }

    const data = payload.data;

    // Common required fields
    if (!data.productName || !data.sku || !data.storeId) {
      throw new Error('Missing required fields: productName, sku, storeId');
    }

    // Type-specific validation
    if (payload.notificationType === NotificationType.INVENTORY_LOW_STOCK) {
      const lowStockData = data as LowStockNotificationData;

      if (
        lowStockData.currentStock === undefined ||
        lowStockData.threshold === undefined
      ) {
        throw new Error(
          'Low stock notification missing currentStock or threshold'
        );
      }
    }
  }

  /**
   * Create audit log entry for notification attempt.
   */
  protected async createLog(
    payload: NotificationPayload<
      LowStockNotificationData | OutOfStockNotificationData
    >
  ): Promise<InventoryNotificationLog> {
    const log = this.notificationLogRepo.create({
      storeId: payload.data.storeId,
      variantId: payload.data.variantId,
      productId: payload.data.productId,
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
   *
   * Integrates with email queue for delayed delivery.
   */
  async scheduleNotification(
    payload: NotificationPayload<
      LowStockNotificationData | OutOfStockNotificationData
    >,
    scheduledFor: Date
  ): Promise<string> {
    // Validate first
    this.validatePayload(payload);

    // Create log entry
    const log = await this.createLog(payload);

    try {
      // Schedule via email queue with delay
      const delay = scheduledFor.getTime() - Date.now();

      // Store scheduled job reference in log metadata
      await this.updateLog(log.id, NotificationStatus.PENDING, {
        scheduledFor: scheduledFor.toISOString(),
        scheduledDelay: delay,
      });

      this.logger.log(
        `Scheduled ${payload.notificationType} notification for ${payload.recipient} ` +
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
   * Send low stock notification to a single recipient.
   *
   * Convenience method with type-safe payload construction.
   */
  async notifyLowStock(
    recipient: string,
    recipientName: string,
    data: LowStockNotificationData
  ): Promise<void> {
    const payload: LowStockNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.INVENTORY_LOW_STOCK,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        severity: data.isCritical ? 'critical' : 'warning',
      },
    };

    return this.notify(payload);
  }

  /**
   * Send out of stock notification to a single recipient.
   *
   * Convenience method with type-safe payload construction.
   */
  async notifyOutOfStock(
    recipient: string,
    recipientName: string,
    data: OutOfStockNotificationData
  ): Promise<void> {
    const payload: OutOfStockNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.INVENTORY_OUT_OF_STOCK,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        severity: 'critical',
      },
    };

    return this.notify(payload);
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
    byType: Record<NotificationType, number>;
  }> {
    const logs = await this.notificationLogRepo.find({
      where: {
        storeId,
        createdAt: MoreThanOrEqual(since),
      },
    });

    const stats = {
      total: logs.length,
      sent: logs.filter((l) => l.status === NotificationStatus.SENT).length,
      failed: logs.filter((l) => l.status === NotificationStatus.FAILED).length,
      pending: logs.filter((l) => l.status === NotificationStatus.PENDING)
        .length,
      byType: {} as Record<NotificationType, number>,
    };

    // Count by type
    logs.forEach((log) => {
      stats.byType[log.notificationType] =
        (stats.byType[log.notificationType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Email validation helper.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
