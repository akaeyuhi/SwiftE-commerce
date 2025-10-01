// src/common/events/orders/order-status-change.event.ts

import { OrderStatus } from 'src/common/enums/order-status.enum';

/**
 * OrderAddressInfo
 *
 * Simplified address structure for events.
 */
export interface OrderAddressInfo {
  firstName: string;
  lastName?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  deliveryInstructions?: string;
}

/**
 * OrderShippingInfo
 *
 * Shipping details for events.
 */
export interface OrderShippingInfo extends OrderAddressInfo {
  shippingMethod?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

/**
 * OrderStatusChangeEvent
 *
 * Emitted when order status changes.
 * Triggers customer notifications for order updates.
 */
export class OrderStatusChangeEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly previousStatus: OrderStatus,
    public readonly newStatus: OrderStatus,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly userName: string,
    public readonly storeId: string,
    public readonly storeName: string,
    public readonly totalAmount: number,
    public readonly items: Array<{
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>,
    public readonly shipping?: OrderShippingInfo,
    public readonly billing?: OrderAddressInfo
  ) {}
}

/**
 * OrderCreatedEvent
 *
 * Emitted when new order is successfully created.
 * Triggers order confirmation email.
 */
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly userName: string,
    public readonly storeId: string,
    public readonly storeName: string,
    public readonly totalAmount: number,
    public readonly items: Array<{
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>,
    public readonly orderUrl: string,
    public readonly shipping: OrderShippingInfo,
    public readonly billing?: OrderAddressInfo
  ) {}
}
