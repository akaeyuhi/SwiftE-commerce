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
  OrderConfirmationNotificationData,
  OrderShippedNotificationData,
  OrderDeliveredNotificationData,
  OrderCancelledNotificationData,
  OrderConfirmationNotificationPayload,
  OrderShippedNotificationPayload,
  OrderDeliveredNotificationPayload,
  OrderCancelledNotificationPayload,
} from 'src/common/interfaces/notifications/order-notification.types';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { OrderNotificationLog } from 'src/entities/infrastructure/notifications/order-notification-log.entity';

/**
 * OrderNotificationService
 *
 * Handles delivery of order-related notifications.
 * Extends BaseNotificationService to inherit retry logic, batch operations, and logging.
 *
 * Primary channel: EMAIL (can be extended to support SMS/Push)
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Audit logging for compliance
 * - Batch notification support
 * - Priority-based delivery
 * - Order lifecycle notifications (confirmation, shipped, delivered, cancelled)
 */
@Injectable()
export class OrderNotificationService extends BaseNotificationService<
  | OrderConfirmationNotificationData
  | OrderShippedNotificationData
  | OrderDeliveredNotificationData
  | OrderCancelledNotificationData,
  OrderNotificationLog
> {
  protected readonly channel = NotificationChannel.EMAIL;
  protected readonly logger = new Logger(OrderNotificationService.name);

  // Retry settings for order notifications
  protected readonly maxRetries = 5;
  protected readonly batchDelay = 200;

  constructor(
    @InjectRepository(OrderNotificationLog)
    private readonly notificationLogRepo: Repository<OrderNotificationLog>,
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
      | OrderConfirmationNotificationData
      | OrderShippedNotificationData
      | OrderDeliveredNotificationData
      | OrderCancelledNotificationData
    >
  ): Promise<any> {
    const notificationType = payload.notificationType;

    switch (notificationType) {
      case NotificationType.ORDER_CONFIRMATION:
        return this.sendOrderConfirmation(
          payload as OrderConfirmationNotificationPayload
        );

      case NotificationType.ORDER_SHIPPED:
        return this.sendOrderShipped(
          payload as OrderShippedNotificationPayload
        );

      case NotificationType.ORDER_DELIVERED:
        return this.sendOrderDelivered(
          payload as OrderDeliveredNotificationPayload
        );

      case NotificationType.ORDER_CANCELLED:
        return this.sendOrderCancelled(
          payload as OrderCancelledNotificationPayload
        );

      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }
  }

  /**
   * Send order confirmation email via queue.
   */
  private async sendOrderConfirmation(
    payload: OrderConfirmationNotificationPayload
  ): Promise<any> {
    const data = payload.data;

    return await this.emailQueue.sendOrderConfirmation(
      payload.recipient,
      payload.recipientName || payload.recipient,
      {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
        currency: 'USD', // TODO: Make configurable
        items: data.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        shippingAddress: data.shippingAddress,
        orderUrl: data.orderUrl,
        // Additional context for template
        storeName: data.storeName,
        orderDate: data.orderDate,
        shippingMethod: data.shippingMethod,
        deliveryInstructions: data.deliveryInstructions,
      },
      { priority: EmailPriority.HIGH }
    );
  }

  /**
   * Send order shipped email via queue.
   */
  private async sendOrderShipped(
    payload: OrderShippedNotificationPayload
  ): Promise<any> {
    const data = payload.data;

    return await this.emailQueue.sendOrderShipped(
      payload.recipient,
      payload.recipientName || payload.recipient,
      {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        estimatedDeliveryDate: data.estimatedDeliveryDate,
        shippingMethod: data.shippingMethod,
        shippingAddress: data.shippingAddress,
        shippedDate: data.shippedDate,
        storeName: data.storeName,
        items: data.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
        })),
      },
      { priority: EmailPriority.HIGH }
    );
  }

  /**
   * Send order delivered email via queue.
   */
  private async sendOrderDelivered(
    payload: OrderDeliveredNotificationPayload
  ): Promise<any> {
    const data = payload.data;

    return await this.emailQueue.sendOrderDelivered(
      payload.recipient,
      payload.recipientName || payload.recipient,
      {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        deliveredDate: data.deliveredDate,
        shippingAddress: data.shippingAddress,
        reviewUrl: data.reviewUrl,
        supportUrl: data.supportUrl,
        storeName: data.storeName,
        items: data.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
        })),
      },
      { priority: EmailPriority.NORMAL }
    );
  }

  /**
   * Send order cancelled email via queue.
   */
  private async sendOrderCancelled(
    payload: OrderCancelledNotificationPayload
  ): Promise<any> {
    const data = payload.data;

    return await this.emailQueue.sendOrderCancelled(
      payload.recipient,
      payload.recipientName || payload.recipient,
      {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        cancelledDate: data.cancelledDate,
        cancellationReason: data.cancellationReason,
        refundAmount: data.refundAmount,
        refundMethod: data.refundMethod,
        storeName: data.storeName,
        items: data.items,
      },
      { priority: EmailPriority.HIGH }
    );
  }

  /**
   * Validate notification payload before sending.
   */
  protected validatePayload(
    payload: NotificationPayload<
      | OrderConfirmationNotificationData
      | OrderShippedNotificationData
      | OrderDeliveredNotificationData
      | OrderCancelledNotificationData
    >
  ): void {
    // Validate recipient email
    if (!payload.recipient || !this.isValidEmail(payload.recipient)) {
      throw new Error(`Invalid email address: ${payload.recipient}`);
    }

    // Validate notification type
    const validTypes = [
      NotificationType.ORDER_CONFIRMATION,
      NotificationType.ORDER_SHIPPED,
      NotificationType.ORDER_DELIVERED,
      NotificationType.ORDER_CANCELLED,
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
    if (!data.orderId || !data.orderNumber || !data.storeId || !data.userId) {
      throw new Error(
        'Missing required fields: orderId, orderNumber, storeId, userId'
      );
    }
  }

  /**
   * Create audit log entry for notification attempt.
   */
  protected async createLog(
    payload: NotificationPayload<
      | OrderConfirmationNotificationData
      | OrderShippedNotificationData
      | OrderDeliveredNotificationData
      | OrderCancelledNotificationData
    >
  ): Promise<OrderNotificationLog> {
    const log = this.notificationLogRepo.create({
      storeId: payload.data.storeId,
      orderId: payload.data.orderId,
      userId: payload.data.userId,
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
    payload: NotificationPayload<
      | OrderConfirmationNotificationData
      | OrderShippedNotificationData
      | OrderDeliveredNotificationData
      | OrderCancelledNotificationData
    >,
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
   * Send order confirmation notification.
   */
  async notifyOrderConfirmation(
    recipient: string,
    recipientName: string,
    data: OrderConfirmationNotificationData
  ): Promise<void> {
    const payload: OrderConfirmationNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.ORDER_CONFIRMATION,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        priority: 'high',
      },
    };

    return this.notify(payload);
  }

  /**
   * Send order shipped notification.
   */
  async notifyOrderShipped(
    recipient: string,
    recipientName: string,
    data: OrderShippedNotificationData
  ): Promise<void> {
    const payload: OrderShippedNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.ORDER_SHIPPED,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        priority: 'high',
      },
    };

    return this.notify(payload);
  }

  /**
   * Send order delivered notification.
   */
  async notifyOrderDelivered(
    recipient: string,
    recipientName: string,
    data: OrderDeliveredNotificationData
  ): Promise<void> {
    const payload: OrderDeliveredNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.ORDER_DELIVERED,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        priority: 'normal',
      },
    };

    return this.notify(payload);
  }

  /**
   * Send order cancelled notification.
   */
  async notifyOrderCancelled(
    recipient: string,
    recipientName: string,
    data: OrderCancelledNotificationData
  ): Promise<void> {
    const payload: OrderCancelledNotificationPayload = {
      recipient,
      recipientName,
      notificationType: NotificationType.ORDER_CANCELLED,
      data,
      metadata: {
        sentAt: new Date().toISOString(),
        priority: 'high',
      },
    };

    return this.notify(payload);
  }

  /**
   * Get notification statistics for an order.
   */
  async getOrderNotificationStats(orderId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<NotificationType, number>;
  }> {
    const logs = await this.notificationLogRepo.find({
      where: { orderId },
    });

    const stats = {
      total: logs.length,
      sent: logs.filter((l) => l.status === NotificationStatus.SENT).length,
      failed: logs.filter((l) => l.status === NotificationStatus.FAILED).length,
      pending: logs.filter((l) => l.status === NotificationStatus.PENDING)
        .length,
      byType: {} as Record<NotificationType, number>,
    };

    logs.forEach((log) => {
      stats.byType[log.notificationType] =
        (stats.byType[log.notificationType] || 0) + 1;
    });

    return stats;
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
