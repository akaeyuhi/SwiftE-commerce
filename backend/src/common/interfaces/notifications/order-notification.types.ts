import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';

/**
 * Base order notification data
 */
export interface BaseOrderNotificationData {
  orderId: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  userId: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

/**
 * Order confirmation notification data
 */
export interface OrderConfirmationNotificationData
  extends BaseOrderNotificationData {
  shippingAddress: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState?: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone?: string;
  shippingMethod?: string;
  deliveryInstructions?: string;
  orderUrl: string;
  orderDate: string;
}

/**
 * Order shipped notification data
 */
export interface OrderShippedNotificationData
  extends BaseOrderNotificationData {
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  shippingMethod?: string;
  shippingAddress: string;
  shippedDate: string;
}

/**
 * Order delivered notification data
 */
export interface OrderDeliveredNotificationData
  extends BaseOrderNotificationData {
  deliveredDate: string;
  shippingAddress: string;
  reviewUrl: string;
  supportUrl: string;
}

/**
 * Order cancelled notification data
 */
export interface OrderCancelledNotificationData
  extends BaseOrderNotificationData {
  cancelledDate: string;
  cancellationReason?: string;
  refundAmount: number;
  refundMethod?: string;
}

/**
 * Type aliases for notification payloads
 */
export type OrderConfirmationNotificationPayload =
  NotificationPayload<OrderConfirmationNotificationData>;
export type OrderShippedNotificationPayload =
  NotificationPayload<OrderShippedNotificationData>;
export type OrderDeliveredNotificationPayload =
  NotificationPayload<OrderDeliveredNotificationData>;
export type OrderCancelledNotificationPayload =
  NotificationPayload<OrderCancelledNotificationData>;
