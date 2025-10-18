import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrderStatusChangeEvent,
  OrderCreatedEvent,
} from 'src/common/events/orders/order-status-change.event';
import {
  OrderConfirmationNotificationData,
  OrderShippedNotificationData,
  OrderDeliveredNotificationData,
  OrderCancelledNotificationData,
} from 'src/common/interfaces/notifications/order-notification.types';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';
import { BaseNotificationListener } from 'src/common/abstracts/infrastucture/base.notification.listener';
import { OrderNotificationService } from 'src/modules/infrastructure/notifications/order/order-notification.service';

type OrderEventType = 'order.created' | 'order.status-changed';
type OrderEventData = OrderCreatedEvent | OrderStatusChangeEvent;

/**
 * OrderNotificationsListener
 *
 * Listens to order domain events and sends email notifications.
 * Extends BaseNotificationListener for retry logic and error handling.
 *
 * Handles:
 * - order.created → Order confirmation email
 * - order.status-changed (SHIPPED) → Shipping notification email
 * - order.status-changed (DELIVERED) → Delivery confirmation email
 * - order.status-changed (CANCELLED) → Cancellation notification email
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Error logging and dead letter queue
 * - Metrics recording
 * - Address and date formatting
 */
@Injectable()
export class OrderNotificationsListener extends BaseNotificationListener<
  OrderEventData,
  OrderEventType
> {
  protected readonly logger = new Logger(OrderNotificationsListener.name);

  constructor(
    protected readonly eventEmitter: EventEmitter2,
    private readonly orderNotifications: OrderNotificationService
  ) {
    super(eventEmitter);
  }

  /**
   * Process order events and route to appropriate handler.
   */
  protected async handleEvent(
    event: DomainEvent<OrderEventData>
  ): Promise<void> {
    switch (event.type) {
      case 'order.created':
        await this.handleOrderCreated(event.data as OrderCreatedEvent);
        break;

      case 'order.status-changed':
        await this.handleOrderStatusChange(
          event.data as OrderStatusChangeEvent
        );
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Get event types this listener handles.
   */
  protected getEventTypes(): OrderEventType[] {
    return ['order.created', 'order.status-changed'];
  }

  /**
   * Filter events to only process those with valid email recipients.
   */
  protected shouldProcessEvent(event: DomainEvent<OrderEventData>): boolean {
    const data = event.data as any;
    return !!(data?.userEmail && this.isValidEmail(data.userEmail));
  }

  /**
   * Handle order created event.
   */
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `Processing order confirmation for order ${event.orderNumber}`
    );

    const notificationData: OrderConfirmationNotificationData = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      storeId: event.storeId,
      storeName: event.storeName,
      userId: event.userId,
      totalAmount: event.totalAmount,
      items: event.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      shippingAddress: this.formatAddress(event.shipping),
      shippingAddressLine1: event.shipping.addressLine1,
      shippingAddressLine2: event.shipping.addressLine2,
      shippingCity: event.shipping.city,
      shippingState: event.shipping.state,
      shippingPostalCode: event.shipping.postalCode,
      shippingCountry: event.shipping.country,
      shippingPhone: event.shipping.phone,
      shippingMethod: event.shipping.shippingMethod || 'Standard Shipping',
      deliveryInstructions: event.shipping.deliveryInstructions,
      orderUrl: event.orderUrl,
      orderDate: this.formatDate(new Date()),
    };

    await this.orderNotifications.notifyOrderConfirmation(
      event.userEmail,
      event.userName,
      notificationData
    );

    this.logger.log(`Order confirmation queued for order ${event.orderNumber}`);
  }

  /**
   * Handle order status change event.
   */
  private async handleOrderStatusChange(
    event: OrderStatusChangeEvent
  ): Promise<void> {
    this.logger.log(
      `Processing status change for order ${event.orderNumber}: ${event.previousStatus} → ${event.newStatus}`
    );

    switch (event.newStatus) {
      case OrderStatus.SHIPPED:
        await this.handleOrderShipped(event);
        break;

      case OrderStatus.DELIVERED:
        await this.handleOrderDelivered(event);
        break;

      case OrderStatus.CANCELLED:
        await this.handleOrderCancelled(event);
        break;

      default:
        this.logger.debug(
          `No notification configured for status: ${event.newStatus}`
        );
    }
  }

  /**
   * Handle order shipped notification.
   */
  private async handleOrderShipped(
    event: OrderStatusChangeEvent
  ): Promise<void> {
    const notificationData: OrderShippedNotificationData = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      storeId: event.storeId,
      storeName: event.storeName,
      userId: event.userId,
      totalAmount: event.totalAmount,
      items: event.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      trackingNumber: event.shipping?.trackingNumber,
      trackingUrl: event.shipping?.trackingNumber
        ? this.generateTrackingUrl(event.shipping.trackingNumber)
        : undefined,
      estimatedDeliveryDate: event.shipping?.estimatedDeliveryDate
        ? this.formatDate(event.shipping.estimatedDeliveryDate)
        : undefined,
      shippingMethod: event.shipping?.shippingMethod || 'Standard Shipping',
      shippingAddress: event.shipping
        ? this.formatAddress(event.shipping)
        : 'Address not provided',
      shippedDate: event.shipping?.shippedAt
        ? this.formatDate(event.shipping.shippedAt)
        : this.formatDate(new Date()),
    };

    await this.orderNotifications.notifyOrderShipped(
      event.userEmail,
      event.userName,
      notificationData
    );

    this.logger.log(
      `Shipping notification queued for order ${event.orderNumber}`
    );
  }

  /**
   * Handle order delivered notification.
   */
  private async handleOrderDelivered(
    event: OrderStatusChangeEvent
  ): Promise<void> {
    const notificationData: OrderDeliveredNotificationData = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      storeId: event.storeId,
      storeName: event.storeName,
      userId: event.userId,
      totalAmount: event.totalAmount,
      items: event.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      deliveredDate: event.shipping?.deliveredAt
        ? this.formatDate(event.shipping.deliveredAt)
        : this.formatDate(new Date()),
      shippingAddress: event.shipping
        ? this.formatAddress(event.shipping)
        : 'Address not provided',
      reviewUrl: this.generateUrl(`/orders/${event.orderId}/review`),
      supportUrl: this.generateUrl(`/stores/${event.storeId}/support`),
    };

    await this.orderNotifications.notifyOrderDelivered(
      event.userEmail,
      event.userName,
      notificationData
    );

    this.logger.log(
      `Delivery confirmation queued for order ${event.orderNumber}`
    );
  }

  /**
   * Handle order cancelled notification.
   */
  private async handleOrderCancelled(
    event: OrderStatusChangeEvent
  ): Promise<void> {
    const notificationData: OrderCancelledNotificationData = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      storeId: event.storeId,
      storeName: event.storeName,
      userId: event.userId,
      totalAmount: event.totalAmount,
      items: event.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      cancelledDate: this.formatDate(new Date()),
      cancellationReason: undefined,
      refundAmount: event.totalAmount,
      refundMethod: 'Original payment method',
    };

    await this.orderNotifications.notifyOrderCancelled(
      event.userEmail,
      event.userName,
      notificationData
    );

    this.logger.log(
      `Cancellation notification queued for order ${event.orderNumber}`
    );
  }

  /**
   * Generate tracking URL for shipping carrier.
   */
  private generateTrackingUrl(trackingNumber: string): string {
    // TODO: Implement carrier-specific tracking URLs
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
}
