import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LowStockEvent,
  OutOfStockEvent,
} from 'src/common/events/inventory/low-stock.event';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import {
  LowStockNotificationData,
  OutOfStockNotificationData,
} from 'src/common/interfaces/notifications/inventory-notification.types';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';
import { BaseNotificationListener } from 'src/common/abstracts/infrastucture/base.notification.listener';
import { Store } from 'src/entities/store/store.entity';

type InventoryEventType = 'inventory.low-stock' | 'inventory.out-of-stock';
type InventoryEventData = LowStockEvent | OutOfStockEvent;

/**
 * InventoryNotificationsListener
 *
 * Event-driven notification orchestrator for inventory alerts.
 * Extends BaseNotificationListener for retry logic, error handling, and utility methods.
 *
 * Handles:
 * - inventory.low-stock → Alert when stock falls below threshold (with cooldown)
 * - inventory.out-of-stock → Critical alert when item completely out of stock (no cooldown)
 *
 * Features:
 * - Cooldown logic to prevent notification spam (1 hour for low-stock alerts)
 * - Automatic retries with exponential backoff (inherited from base class)
 * - Batch notifications to all store admins/moderators
 * - Category extraction from product data
 * - Manual notification trigger capability
 * - Cooldown monitoring and statistics
 *
 * Architecture:
 * - Uses VariantsService to load store data (avoids circular dependency)
 * - Delegates role management to StoreRoleService
 * - In-memory cooldown cache (upgrade to Redis for distributed systems)
 */
@Injectable()
export class InventoryNotificationsListener extends BaseNotificationListener<
  InventoryEventData,
  InventoryEventType
> {
  protected readonly logger = new Logger(InventoryNotificationsListener.name);

  // Cooldown configuration
  private readonly alertCache = new Map<string, number>();
  private readonly ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  // Override retry config for inventory alerts
  protected readonly maxRetries: number = 3;
  protected readonly baseRetryDelay: number = 3000; // 3 seconds

  constructor(
    eventEmitter: EventEmitter2,
    private readonly variantService: VariantsService,
    private readonly storeRoleService: StoreRoleService,
    private readonly inventoryNotifications: InventoryNotificationService
  ) {
    super(eventEmitter);
  }

  /**
   * Get event types this listener handles (for metadata).
   */
  protected getEventTypes(): InventoryEventType[] {
    return ['inventory.low-stock', 'inventory.out-of-stock'];
  }

  /**
   * Process inventory events and route to appropriate handler.
   */
  protected async handleEvent(
    event: DomainEvent<InventoryEventData>
  ): Promise<void> {
    switch (event.type) {
      case 'inventory.low-stock':
        await this.handleLowStock(event.data as LowStockEvent);
        break;

      case 'inventory.out-of-stock':
        await this.handleOutOfStock(event.data as OutOfStockEvent);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Handle low stock events.
   *
   * Sends notifications to all store admins and moderators.
   * Implements cooldown to prevent notification spam.
   */
  async handleLowStock(event: LowStockEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // Check cooldown to prevent spam
      if (this.isInCooldown(event.variantId, 'low-stock')) {
        this.logger.debug(
          `Skipping low stock alert for ${event.sku} - in cooldown period`
        );
        return;
      }

      this.logger.log(
        `Processing low stock alert for ${event.sku} (current: ${event.currentStock}, threshold: ${event.threshold})`
      );

      const { variant, store } = await this.getVariantWithsStore(
        event.variantId
      );

      // Get all admins and moderators for this store
      const recipients = await this.getStoreNotificationRecipients(
        event.storeId
      );

      if (recipients.length === 0) {
        this.logger.warn(
          `No admins/moderators found for store ${event.storeId} (${store.name}). ` +
            `Low stock alert not sent for ${event.sku}`
        );
        return;
      }

      // Extract category name
      const categoryName = this.extractCategoryName(variant.product.categories);

      // Build notification data
      const notificationData: LowStockNotificationData = {
        productName: event.productName,
        sku: event.sku,
        category: categoryName || event.category || 'Uncategorized',
        currentStock: event.currentStock,
        threshold: event.threshold,
        recentSales: event.recentSales,
        estimatedDays: event.estimatedDaysUntilStockout,
        storeId: event.storeId,
        productId: event.productId,
        variantId: event.variantId,
        storeName: store.name,
        inventoryManagementUrl: this.generateUrl(
          `/stores/${event.storeId}/products/${event.productId}/inventory`
        ),
        isCritical: event.currentStock <= Math.floor(event.threshold / 2),
      };

      // Send notifications using batch processing from base class
      await this.batchProcess(
        recipients,
        async (recipient) => {
          await this.inventoryNotifications.notifyLowStock(
            recipient.email,
            recipient.name,
            notificationData
          );
        },
        100 // 100ms delay between notifications
      );

      // Update cooldown cache
      this.setCooldown(event.variantId, 'low-stock');

      const duration = Date.now() - startTime;
      this.recordMetrics('inventory.low-stock', true, duration);

      this.logger.log(
        `Low stock alerts for ${event.sku} sent to ${recipients.length} recipients`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetrics('inventory.low-stock', false, duration);

      this.logger.error(
        `Failed to process low stock event for ${event.sku}`,
        error.stack
      );

      // Optionally rethrow for retry logic if needed
      throw error;
    }
  }

  /**
   * Handle out of stock events (higher priority).
   *
   * Sends critical notifications immediately without cooldown.
   * Out of stock alerts are not subject to cooldown due to severity.
   */
  async handleOutOfStock(event: OutOfStockEvent): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.warn(
        `Processing OUT OF STOCK alert for ${event.sku} - CRITICAL`
      );

      const { variant, store } = await this.getVariantWithsStore(
        event.variantId
      );

      // Get recipients
      const recipients = await this.getStoreNotificationRecipients(
        event.storeId
      );

      if (recipients.length === 0) {
        this.logger.warn(
          `No admins/moderators found for store ${event.storeId} (${store.name}). ` +
            `Out of stock alert not sent for ${event.sku}`
        );
        return;
      }

      // Extract category name
      const categoryName = this.extractCategoryName(variant.product.categories);

      // Build notification data
      const notificationData: OutOfStockNotificationData = {
        productName: event.productName,
        sku: event.sku,
        category: categoryName || event.category || 'Uncategorized',
        storeId: event.storeId,
        productId: event.productId,
        variantId: event.variantId,
        storeName: store.name,
        inventoryManagementUrl: this.generateUrl(
          `/stores/${event.storeId}/products/${event.productId}/inventory`
        ),
      };

      // Send critical notifications immediately (faster batch processing)
      await this.batchProcess(
        recipients,
        async (recipient) => {
          await this.inventoryNotifications.notifyOutOfStock(
            recipient.email,
            recipient.name,
            notificationData
          );
        },
        50 // 50ms delay for critical alerts
      );

      const duration = Date.now() - startTime;
      this.recordMetrics('inventory.out-of-stock', true, duration);

      this.logger.log(
        `OUT OF STOCK alerts for ${event.sku} sent to ${recipients.length} recipients`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetrics('inventory.out-of-stock', false, duration);

      this.logger.error(
        `Failed to process out of stock event for ${event.sku}`,
        error.stack
      );

      // Rethrow to trigger retry if needed
      throw error;
    }
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  /**
   * Load variant with all necessary relations.
   *
   * Loads: variant → product → (store, categories)
   */
  private async loadVariantWithRelations(
    variantId: string
  ): Promise<ProductVariant | null> {
    try {
      return await this.variantService.findWithRelations(variantId);
    } catch (error) {
      this.logger.error(
        `Failed to load variant ${variantId} with relations`,
        error.stack
      );
      return null;
    }
  }

  private async getVariantWithsStore(
    variantId: string
  ): Promise<{ variant: ProductVariant; store: Store }> {
    const variant = await this.loadVariantWithRelations(variantId);

    if (!variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    const store = variant.product?.store;
    if (!store) {
      throw new Error(
        `Store not found for variant ${variantId} (product: ${variant.product.id})`
      );
    }

    return { variant, store };
  }

  /**
   * Extract primary category name from product categories.
   *
   * Prefers top-level categories over nested ones.
   */
  private extractCategoryName(
    categories?: Array<{ name: string; parent?: any }>
  ): string | null {
    if (!categories || categories.length === 0) {
      return null;
    }

    // Prefer top-level categories (without parent)
    const topLevelCategory = categories.find((cat) => !cat.parent);
    if (topLevelCategory) {
      return topLevelCategory.name;
    }

    // Fallback to first available category
    return categories[0].name;
  }

  /**
   * Get all store admins and moderators eligible for notifications.
   */
  private async getStoreNotificationRecipients(
    storeId: string
  ): Promise<
    Array<{ email: string; name: string; userId: string; role: StoreRoles }>
  > {
    try {
      const storeRoles = await this.storeRoleService.getStoreRoles(storeId);

      // Filter for admin and moderator roles only
      const eligibleRoles = storeRoles.filter(
        (role) =>
          role.isActive &&
          (role.roleName === StoreRoles.ADMIN ||
            role.roleName === StoreRoles.MODERATOR)
      );

      // Map to recipient format
      return eligibleRoles
        .filter((role) => role.user?.email) // Filter out invalid users
        .map((role) => ({
          email: role.user.email,
          name: this.getUserDisplayName(role.user),
          userId: role.user.id,
          role: role.roleName,
        }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch notification recipients for store ${storeId}`,
        error.stack
      );
      return [];
    }
  }

  // ===============================
  // Cooldown Management
  // ===============================

  /**
   * Check if variant is in cooldown period.
   */
  private isInCooldown(variantId: string, type: string): boolean {
    const key = this.getCooldownKey(variantId, type);
    const lastAlertTime = this.alertCache.get(key);

    if (!lastAlertTime) return false;

    const timeSinceLastAlert = Date.now() - lastAlertTime;
    return timeSinceLastAlert < this.ALERT_COOLDOWN_MS;
  }

  /**
   * Set cooldown for variant.
   */
  private setCooldown(variantId: string, type: string): void {
    const key = this.getCooldownKey(variantId, type);
    this.alertCache.set(key, Date.now());
  }

  /**
   * Generate cooldown cache key.
   */
  private getCooldownKey(variantId: string, type: string): string {
    return `${variantId}:${type}`;
  }

  /**
   * Clear cooldown for a variant.
   */
  clearCooldown(variantId: string, type: string): void {
    const key = this.getCooldownKey(variantId, type);
    this.alertCache.delete(key);
    this.logger.log(`Cleared cooldown for ${key}`);
  }

  /**
   * Clear all cooldowns for a variant (all notification types).
   */
  clearAllVariantCooldowns(variantId: string): number {
    let clearedCount = 0;
    const types = ['low-stock', 'out-of-stock'];

    types.forEach((type) => {
      const key = this.getCooldownKey(variantId, type);
      if (this.alertCache.has(key)) {
        this.alertCache.delete(key);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      this.logger.log(
        `Cleared ${clearedCount} cooldowns for variant ${variantId}`
      );
    }

    return clearedCount;
  }

  /**
   * Get all active cooldowns (for monitoring/debugging).
   */
  getActiveCooldowns(): Array<{
    variantId: string;
    type: string;
    expiresIn: number;
    expiresInMinutes: number;
  }> {
    const now = Date.now();
    const cooldowns: Array<{
      variantId: string;
      type: string;
      expiresIn: number;
      expiresInMinutes: number;
    }> = [];

    this.alertCache.forEach((timestamp, key) => {
      const [variantId, type] = key.split(':');
      const expiresIn = this.ALERT_COOLDOWN_MS - (now - timestamp);

      if (expiresIn > 0) {
        cooldowns.push({
          variantId,
          type,
          expiresIn,
          expiresInMinutes: Math.ceil(expiresIn / 60000),
        });
      } else {
        // Clean up expired entries
        this.alertCache.delete(key);
      }
    });

    return cooldowns;
  }

  /**
   * Get cooldown statistics.
   */
  getCooldownStats(): {
    totalActive: number;
    byType: Record<string, number>;
    oldestCooldown: number | null;
    newestCooldown: number | null;
  } {
    const activeCooldowns = this.getActiveCooldowns();

    const byType: Record<string, number> = {};
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    activeCooldowns.forEach((cooldown) => {
      byType[cooldown.type] = (byType[cooldown.type] || 0) + 1;

      const timestamp = Date.now() - cooldown.expiresIn;
      if (oldestTimestamp === null || timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
      }
      if (newestTimestamp === null || timestamp > newestTimestamp) {
        newestTimestamp = timestamp;
      }
    });

    return {
      totalActive: activeCooldowns.length,
      byType,
      oldestCooldown: oldestTimestamp,
      newestCooldown: newestTimestamp,
    };
  }

  /**
   * Schedule automatic cooldown cleanup.
   */
  cleanupExpiredCooldowns(): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.alertCache.forEach((timestamp, key) => {
      if (now - timestamp > this.ALERT_COOLDOWN_MS) {
        this.alertCache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cooldowns`);
    }

    return cleanedCount;
  }

  // ===============================
  // Manual Testing & Override
  // ===============================

  /**
   * Manually trigger notification for variant (bypasses cooldown).
   *
   * Admin operation for testing or force-sending notifications.
   */
  async manualNotify(
    variantId: string,
    notificationType: 'low-stock' | 'out-of-stock'
  ): Promise<{ success: boolean; recipientCount: number; error?: string }> {
    try {
      const variant = await this.loadVariantWithRelations(variantId);

      if (!variant) {
        return {
          success: false,
          recipientCount: 0,
          error: 'Variant not found',
        };
      }

      if (!variant.product?.store) {
        return {
          success: false,
          recipientCount: 0,
          error: 'Store not found for variant',
        };
      }

      const recipients = await this.getStoreNotificationRecipients(
        variant.product.store.id
      );

      if (recipients.length === 0) {
        return {
          success: false,
          recipientCount: 0,
          error: 'No eligible recipients found',
        };
      }

      // Clear cooldown to allow notification
      this.clearCooldown(variantId, notificationType);

      // Create synthetic event for testing
      const syntheticEvent =
        notificationType === 'low-stock'
          ? ({
              variantId: variant.id,
              productId: variant.product.id,
              storeId: variant.product.store.id,
              sku: variant.sku,
              productName: variant.product.name,
              currentStock: 5,
              threshold: 10,
              recentSales: 15,
              estimatedDaysUntilStockout: 3,
              category:
                this.extractCategoryName(variant.product.categories) ||
                'Test Category',
            } as LowStockEvent)
          : ({
              variantId: variant.id,
              productId: variant.product.id,
              storeId: variant.product.store.id,
              sku: variant.sku,
              productName: variant.product.name,
              category:
                this.extractCategoryName(variant.product.categories) ||
                'Test Category',
            } as OutOfStockEvent);

      if (notificationType === 'low-stock') {
        await this.handleLowStock(syntheticEvent as LowStockEvent);
      } else {
        await this.handleOutOfStock(syntheticEvent as OutOfStockEvent);
      }

      this.logger.warn(
        `Manual notification triggered for ${variant.sku} (${notificationType}) - sent to ${recipients.length} recipients`
      );

      return {
        success: true,
        recipientCount: recipients.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to manually trigger notification for variant ${variantId}`,
        error.stack
      );
      return {
        success: false,
        recipientCount: 0,
        error: error.message,
      };
    }
  }
}
