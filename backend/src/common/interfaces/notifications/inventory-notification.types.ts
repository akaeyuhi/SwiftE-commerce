import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';

/**
 * Low stock notification data payload
 */
export interface LowStockNotificationData {
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  threshold: number;
  recentSales: number;
  estimatedDays: number;
  storeId: string;
  productId: string;
  variantId: string;
  storeName: string;
  inventoryManagementUrl: string;
  isCritical: boolean;
}

/**
 * Out of stock notification data payload
 */
export interface OutOfStockNotificationData {
  productName: string;
  sku: string;
  category: string;
  storeId: string;
  productId: string;
  variantId: string;
  storeName: string;
  inventoryManagementUrl: string;
}

/**
 * Type aliases for notification payloads
 */
export type LowStockNotificationPayload =
  NotificationPayload<LowStockNotificationData>;
export type OutOfStockNotificationPayload =
  NotificationPayload<OutOfStockNotificationData>;
