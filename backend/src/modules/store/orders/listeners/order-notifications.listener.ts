// src/modules/store/orders/listeners/order-notifications.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrderStatusChangeEvent,
  OrderCreatedEvent,
  OrderShippingInfo,
  OrderAddressInfo,
} from 'src/common/events/orders/order-status-change.event';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import {
  OrderConfirmationNotificationData,
  OrderShippedNotificationData,
  OrderDeliveredNotificationData,
  OrderCancelledNotificationData,
} from 'src/common/interfaces/notifications/order-notification.types';
import {OrderNotificationService} from "src/modules/infrastructure/notifications/order/order-notification.service";

/**
 * OrderNotificationsListener
 *
 * Event-driven notification orchestrator for order status changes.
 * Listens to order events and delegates notification delivery to OrderNotificationService.
 *
 * Responsibilities:
 * - Transform events into notification payloads
 * - Route notifications based on order status
 * - Format data for email templates
 *
 * Decoupled architecture:
 * - OrdersService emits events (doesn't know about notifications)
 * - This listener orchestrates notifications (doesn't know about email details)
 * - OrderNotificationService handles delivery (doesn't know about business logic)
 * - EmailQueueService manages async email delivery
 */
@Injectable()
export class OrderNotificationsListener {
  private readonly logger = new Logger(OrderNotificationsListener.name);

  constructor(private readonly orderNotifications: OrderNotificationService) {}

  /**
   * Handle order creation events.
   */
  @OnEvent('order.created', { async: true })
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      this.logger.log(
        `Processing order confirmation for order ${event.orderNumber} to ${event.userEmail}`
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
        shippingAddress: this.formatOrderInfoAddress(event.shipping),
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
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      };

      await this.orderNotifications.notifyOrderConfirmation(
        event.userEmail,
        event.userName,
        notificationData
      );

      this.logger.log(
        `Order confirmation queued for order ${event.orderNumber}`
      );
    } catch (error) {
      this.logger.error(
        `Error processing order.created event for order ${event.orderNumber}`,
        error.stack
      );
    }
  }

  /**
   * Handle order status change events.
   */
  @OnEvent('order.status-changed', { async: true })
  async handleOrderStatusChange(event: OrderStatusChangeEvent): Promise<void> {
    try {
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
    } catch (error) {
      this.logger.error(
        `Error processing order.status-changed event for order ${event.orderNumber}`,
        error.stack
      );
    }
  }

  /**
   * Handle order shipped notification.
   */
  private async handleOrderShipped(
    event: OrderStatusChangeEvent
  ): Promise<void> {
    this.logger.log(
      `Processing shipping notification for order ${event.orderNumber}`
    );

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
        ? this.formatOrderInfoAddress(event.shipping)
        : 'Address not provided',
      shippedDate: event.shipping?.shippedAt
        ? this.formatDate(event.shipping.shippedAt)
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
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
    this.logger.log(
      `Processing delivery confirmation for order ${event.orderNumber}`
    );

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
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
      shippingAddress: event.shipping
        ? this.formatOrderInfoAddress(event.shipping)
        : 'Address not provided',
      reviewUrl: this.generateReviewUrl(event.orderId),
      supportUrl: this.generateSupportUrl(event.storeId),
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
   * Handle order cancellation notification.
   */
  private async handleOrderCancelled(
    event: OrderStatusChangeEvent
  ): Promise<void> {
    this.logger.log(
      `Processing cancellation notification for order ${event.orderNumber}`
    );

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
      cancelledDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      cancellationReason: undefined, // Can be passed via event metadata
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
   * Format OrderInfo address for display in emails.
   */
  private formatOrderInfoAddress(
    address: OrderShippingInfo | OrderAddressInfo
  ): string {
    const parts: string[] = [];

    const fullName = [address.firstName, address.lastName]
      .filter(Boolean)
      .join(' ');
    if (fullName) parts.push(fullName);

    if (address.company) parts.push(address.company);

    parts.push(address.addressLine1);
    if (address.addressLine2) parts.push(address.addressLine2);

    const cityLine = [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(', ');
    parts.push(cityLine);

    parts.push(address.country);

    if (address.phone) parts.push(`Phone: ${address.phone}`);

    return parts.join('\n');
  }

  /**
   * Format date for display.
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Generate tracking URL.
   */
  private generateTrackingUrl(trackingNumber: string): string {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }

  /**
   * Generate review URL for the order.
   */
  private generateReviewUrl(orderId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
    return `${baseUrl}/orders/${orderId}/review`;
  }

  /**
   * Generate support URL for the store.
   */
  private generateSupportUrl(storeId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
    return `${baseUrl}/stores/${storeId}/support`;
  }
}
