import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * InventoryThresholdsConfig
 *
 * Centralized configuration for inventory alert thresholds.
 * Supports global defaults and per-category overrides.
 *
 * Store thresholds in database for runtime configuration
 * without deployments. This implementation uses env vars as fallback.
 */
@Injectable()
export class InventoryThresholdsConfig {
  // Default threshold percentages and absolute values
  private readonly DEFAULT_LOW_STOCK_THRESHOLD = 10;
  private readonly DEFAULT_CRITICAL_THRESHOLD = 5;

  // Category-specific thresholds
  private readonly categoryThresholds: Map<string, number> = new Map([
    ['electronics', 15],
    ['perishable', 20],
    ['seasonal', 25],
    ['fast-moving', 30],
  ]);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get low stock threshold for a product category.
   *
   * Priority: Category-specific > Global config > Default
   */
  getLowStockThreshold(category?: string): number {
    if (category && this.categoryThresholds.has(category.toLowerCase())) {
      return this.categoryThresholds.get(category.toLowerCase())!;
    }

    return this.configService.get<number>(
      'INVENTORY_LOW_STOCK_THRESHOLD',
      this.DEFAULT_LOW_STOCK_THRESHOLD
    );
  }

  /**
   * Get critical stock threshold (triggers urgent alerts).
   */
  getCriticalThreshold(category?: string): number {
    const lowThreshold = this.getLowStockThreshold(category);
    return Math.floor(lowThreshold / 2);
  }

  /**
   * Check if current stock is below threshold.
   */
  isLowStock(currentStock: number, category?: string): boolean {
    return (
      currentStock <= this.getLowStockThreshold(category) && currentStock > 0
    );
  }

  /**
   * Check if stock is critically low (higher priority).
   */
  isCriticalStock(currentStock: number, category?: string): boolean {
    return (
      currentStock <= this.getCriticalThreshold(category) && currentStock > 0
    );
  }

  /**
   * Check if completely out of stock.
   */
  isOutOfStock(currentStock: number): boolean {
    return currentStock <= 0;
  }
}
