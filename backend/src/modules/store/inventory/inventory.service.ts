import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LowStockEvent,
  OutOfStockEvent,
} from 'src/common/events/inventory/low-stock.event';
import { InventoryThresholdsConfig } from './config/inventory-thresholds.config';
import { InventoryRepository } from 'src/modules/store/inventory/inventory.repository';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { BaseService } from 'src/common/abstracts/base.service';

/**
 * InventoryService
 *
 * Manages product variant inventory with automatic low-stock detection.
 * Emits events when inventory crosses threshold boundaries.
 *
 * Event-driven approach ensures:
 * - Decoupling from notification logic
 * - Easy addition of new listeners (analytics, webhooks, etc.)
 * - Testability without side effects
 */
@Injectable()
export class InventoryService extends BaseService<Inventory> {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly thresholdsConfig: InventoryThresholdsConfig
  ) {
    super(inventoryRepo);
  }

  /**
   * Update inventory quantity and check for threshold violations.
   *
   * @param inventoryId - inventory record id
   * @param updateDto - { quantity: number }
   * @returns updated inventory
   */
  async update(
    inventoryId: string,
    updateDto: { quantity: number }
  ): Promise<Inventory> {
    const inventory = await this.inventoryRepo.findOne({
      where: { id: inventoryId },
      relations: ['variant', 'variant.product', 'store'],
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const previousQuantity = inventory.quantity;
    inventory.quantity = updateDto.quantity;

    const saved = await this.inventoryRepo.save(inventory);

    // Emit events only when crossing thresholds (downward direction)
    if (previousQuantity > updateDto.quantity) {
      await this.checkAndEmitStockEvents(saved, previousQuantity);
    }

    return saved;
  }

  async getQuantity(variantId: string) {
    const inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
    });
    return inv ? inv.quantity : 0;
  }

  async adjust(variantId: string, delta: number) {
    const inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
      lock: { mode: 'pessimistic_write' },
    });
    if (!inv) throw new NotFoundException('Inventory not found');
    inv.quantity += delta;
    if (inv.quantity < 0) throw new Error('Insufficient stock');
    return this.inventoryRepo.save(inv);
  }

  async set(variantId: string, qty: number) {
    let inv = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
    });
    if (!inv) {
      inv = this.inventoryRepo.create({
        variant: { id: variantId } as any,
        quantity: qty,
      });
    } else {
      inv.quantity = qty;
    }
    return this.inventoryRepo.save(inv);
  }

  /**
   * Adjust inventory by delta (e.g., -5 after order, +10 after restock).
   *
   * @param variantId - variant id
   * @param delta - positive or negative adjustment
   * @returns updated inventory
   */
  async adjustInventory(variantId: string, delta: number): Promise<Inventory> {
    const inventory = await this.findInventoryByVariantId(variantId);

    if (!inventory) {
      throw new NotFoundException(
        `Inventory not found for variant ${variantId}`
      );
    }

    const newQuantity = inventory.quantity + delta;

    if (newQuantity < 0) {
      this.logger.warn(
        `Attempted to set negative inventory for variant ${variantId}. ` +
          `Current: ${inventory.quantity}, Delta: ${delta}`
      );
      throw new Error('Insufficient stock');
    }

    return this.update(inventory.id, { quantity: newQuantity });
  }

  /**
   * Find inventory by variant ID with relations.
   */
  async findInventoryByVariantId(variantId: string): Promise<Inventory | null> {
    return this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
      relations: ['variant', 'variant.product', 'store'],
    });
  }

  /**
   * Check stock levels and emit appropriate events.
   *
   * Events emitted only when crossing threshold boundaries to prevent spam.
   * Implements debouncing via state tracking (consider Redis for distributed systems).
   *
   * @param inventory - inventory record with relations loaded
   * @param previousQuantity - quantity before update
   * @param category
   */
  private async checkAndEmitStockEvents(
    inventory: Inventory,
    previousQuantity: number,
    category?: string
  ): Promise<void> {
    const currentQuantity = inventory.quantity;
    const product = inventory.variant.product;

    // Out of stock (highest priority)
    if (
      this.thresholdsConfig.isOutOfStock(currentQuantity) &&
      !this.thresholdsConfig.isOutOfStock(previousQuantity)
    ) {
      const event = new OutOfStockEvent(
        inventory.variant.id,
        product.id,
        inventory.store.id,
        inventory.variant.sku,
        product.name,
        category
      );

      this.logger.warn(
        `OUT OF STOCK: ${product.name} (SKU: ${inventory.variant.sku}) - Store: ${inventory.store.id}`
      );

      this.eventEmitter.emit('inventory.out-of-stock', event);
      return;
    }

    // Critical low stock (urgent)
    if (
      this.thresholdsConfig.isCriticalStock(currentQuantity) &&
      !this.thresholdsConfig.isCriticalStock(previousQuantity)
    ) {
      await this.emitLowStockEvent(inventory, true);
      return;
    }

    // Low stock (warning)
    if (
      this.thresholdsConfig.isLowStock(currentQuantity) &&
      !this.thresholdsConfig.isLowStock(previousQuantity)
    ) {
      await this.emitLowStockEvent(inventory, false);
    }
  }

  /**
   * Emit low stock event with calculated metrics.
   */
  private async emitLowStockEvent(
    inventory: Inventory,
    isCritical: boolean
  ): Promise<void> {
    const product = inventory.variant.product;
    const threshold = this.thresholdsConfig.getLowStockThreshold();

    // Calculate sales velocity (last 7 days) - implement based on your Order entity
    const recentSales = await this.calculateRecentSales(inventory.variant.id);
    const estimatedDays =
      recentSales > 0 ? Math.floor(inventory.quantity / (recentSales / 7)) : 0;

    const event = new LowStockEvent(
      inventory.variant.id,
      product.id,
      inventory.store.id,
      inventory.variant.sku,
      product.name,
      inventory.quantity,
      threshold,
      recentSales,
      estimatedDays
    );

    const severity = isCritical ? 'CRITICAL' : 'WARNING';
    this.logger.warn(
      `${severity} LOW STOCK: ${product.name} (SKU: ${inventory.variant.sku}) - ` +
        `Current: ${inventory.quantity}, Threshold: ${threshold}, Est. days: ${estimatedDays}`
    );

    this.eventEmitter.emit('inventory.low-stock', event);
  }

  /**
   * Calculate recent sales for a variant (last 7 days).
   *
   * TODO: Implement based on your OrderItem entity.
   * This is a placeholder - adjust query based on your schema.
   */
  private async calculateRecentSales(_variantId: string): Promise<number> {
    // Example query (adjust to your schema):
    // const sevenDaysAgo = new Date();
    // sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    //
    // const result = await this.orderItemRepo
    //   .createQueryBuilder('orderItem')
    //   .select('SUM(orderItem.quantity)', 'total')
    //   .where('orderItem.variantId = :variantId', { variantId })
    //   .andWhere('orderItem.createdAt >= :since', { since: sevenDaysAgo })
    //   .getRawOne();
    //
    // return parseInt(result?.total || '0', 10);

    // Placeholder return
    return 0;
  }
}
