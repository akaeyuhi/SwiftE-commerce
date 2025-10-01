import {Category} from "src/entities/store/product/category.entity";

/**
 * LowStockEvent
 *
 * Emitted when product variant inventory falls below configured threshold.
 * Triggers notifications to store admins and moderators.
 */
export class LowStockEvent {
  constructor(
    public readonly variantId: string,
    public readonly productId: string,
    public readonly storeId: string,
    public readonly sku: string,
    public readonly productName: string,
    public readonly currentStock: number,
    public readonly threshold: number,
    public readonly recentSales: number = 0,
    public readonly estimatedDaysUntilStockout: number = 0,
    public readonly category?: string
  ) {}
}

/**
 * OutOfStockEvent
 *
 * Emitted when inventory reaches zero.
 * Higher priority than low stock alerts.
 */
export class OutOfStockEvent {
  constructor(
    public readonly variantId: string,
    public readonly productId: string,
    public readonly storeId: string,
    public readonly sku: string,
    public readonly productName: string,
    public readonly category?: string
  ) {}
}
