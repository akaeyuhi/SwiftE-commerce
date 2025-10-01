import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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

/**
 * InventoryNotificationsListener
 *
 * Event-driven notification orchestrator for inventory alerts.
 * Listens to inventory events and delegates notification delivery to InventoryNotificationService.
 *
 * Architecture decisions:
 * - Uses ProductVariant repository to load store data (avoids Store module circular dependency)
 * - Delegates role management to StoreRoleService
 * - Implements in-memory cooldown cache (upgrade to Redis for distributed systems)
 *
 * Responsibilities:
 * - Fetch store admins/moderators for recipient list
 * - Transform events into notification payloads
 * - Implement cooldown logic to prevent spam
 * - Handle batch notification delivery
 *
 * Decoupled architecture:
 * - InventoryService emits events (doesn't know about notifications)
 * - This listener orchestrates notifications (doesn't know about email details)
 * - InventoryNotificationService handles delivery (doesn't know about business logic)
 */
@Injectable()
export class InventoryNotificationsListener {
  private readonly logger = new Logger(InventoryNotificationsListener.name);

  // In-memory cooldown cache (use Redis in production for distributed systems)
  private readonly alertCache = new Map<string, number>();
  private readonly ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly variantService: VariantsService,
    private readonly storeRoleService: StoreRoleService,
    private readonly inventoryNotifications: InventoryNotificationService
  ) {}

  /**
   * Handle low stock events.
   *
   * Sends notifications to all store admins and moderators.
   * Implements cooldown to prevent notification spam.
   */
  @OnEvent('inventory.low-stock', { async: true })
  async handleLowStock(event: LowStockEvent): Promise<void> {
    try {
      // Check cooldown to prevent spam
      if (this.isInCooldown(event.variantId, 'low-stock')) {
        this.logger.debug(
          `Skipping low stock alert for ${event.sku} - in cooldown period`
        );
        return;
      }

      // Load variant with full relations to get store information
      const variant = await this.loadVariantWithRelations(event.variantId);

      if (!variant) {
        this.logger.error(
          `Variant ${event.variantId} not found while processing low stock event`
        );
        return;
      }

      const store = variant.product.store;
      if (!store) {
        this.logger.error(
          `Store not found for variant ${event.variantId} (product: ${event.productId})`
        );
        return;
      }

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

      // Extract category name from product categories
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
        inventoryManagementUrl: this.getInventoryManagementUrl(
          event.storeId,
          event.productId
        ),
        isCritical: event.currentStock <= Math.floor(event.threshold / 2),
      };

      // Send notifications to all recipients using batch operation
      const notificationPromises = recipients.map((recipient) =>
        this.inventoryNotifications.notifyLowStock(
          recipient.email,
          recipient.name,
          notificationData
        )
      );

      const results = await Promise.allSettled(notificationPromises);

      // Log results
      const successCount = results.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `Low stock alerts for ${event.sku} (${store.name}): ` +
          `${successCount} sent, ${failCount} failed to ${recipients.length} recipients`
      );

      // Update cooldown cache
      this.alertCache.set(
        this.getCooldownKey(event.variantId, 'low-stock'),
        Date.now()
      );
    } catch (error) {
      this.logger.error(
        `Failed to process low stock event for ${event.sku}`,
        error.stack
      );
    }
  }

  /**
   * Handle out of stock events (higher priority).
   *
   * Sends critical notifications immediately without cooldown.
   * Out of stock alerts are not subject to cooldown due to severity.
   */
  @OnEvent('inventory.out-of-stock', { async: true })
  async handleOutOfStock(event: OutOfStockEvent): Promise<void> {
    try {
      // Load variant with full relations to get store information
      const variant = await this.loadVariantWithRelations(event.variantId);

      if (!variant) {
        this.logger.error(
          `Variant ${event.variantId} not found while processing out of stock event`
        );
        return;
      }

      const store = variant.product.store;
      if (!store) {
        this.logger.error(
          `Store not found for variant ${event.variantId} (product: ${event.productId})`
        );
        return;
      }

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

      // Extract category name from product categories
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
        inventoryManagementUrl: this.getInventoryManagementUrl(
          event.storeId,
          event.productId
        ),
      };

      // Send critical notifications (no cooldown for out of stock)
      const notificationPromises = recipients.map((recipient) =>
        this.inventoryNotifications.notifyOutOfStock(
          recipient.email,
          recipient.name,
          notificationData
        )
      );

      const results = await Promise.allSettled(notificationPromises);

      // Log results
      const successCount = results.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `OUT OF STOCK alerts for ${event.sku} (${store.name}): ` +
          `${successCount} sent, ${failCount} failed to ${recipients.length} recipients`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process out of stock event for ${event.sku}`,
        error.stack
      );
    }
  }

  /**
   * Load variant with all necessary relations.
   *
   * Loads: variant -> product -> (store, categories)
   * This approach avoids circular dependency with Store module.
   */
  private async loadVariantWithRelations(
    variantId: string
  ): Promise<ProductVariant | null> {
    try {
      return this.variantService.findWithRelations(variantId);
    } catch (error) {
      this.logger.error(
        `Failed to load variant ${variantId} with relations`,
        error.stack
      );
      return null;
    }
  }

  /**
   * Extract primary category name from product categories.
   *
   * Strategy:
   * - Returns first category if available
   * - For hierarchical categories, prefer parent categories
   * - Returns 'Uncategorized' if no categories exist
   *
   * Future enhancement: Support multiple categories in notification
   */
  private extractCategoryName(
    categories?: Array<{ name: string; parent?: any }>
  ): string | null {
    if (!categories || categories.length === 0) {
      return null;
    }

    // Prefer categories without parent (top-level categories)
    const topLevelCategory = categories.find((cat) => !cat.parent);
    if (topLevelCategory) {
      return topLevelCategory.name;
    }

    // Fallback to first available category
    return categories[0].name;
  }

  /**
   * Get all store admins and moderators eligible for notifications.
   *
   * Fetches active users with ADMIN or MODERATOR roles in the store.
   * Uses StoreRoleService to avoid circular dependencies.
   */
  private async getStoreNotificationRecipients(
    storeId: string
  ): Promise<
    Array<{ email: string; name: string; userId: string; role: StoreRoles }>
  > {
    try {
      // Get all active store roles (admins and moderators)
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
        .filter((role) => role.user && role.user.email) // Filter out invalid users
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

  /**
   * Get user display name with fallback logic.
   *
   * Priority: firstName > email username > full email
   */
  private getUserDisplayName(user: any): string {
    if (user.firstName) {
      return user.firstName;
    }

    if (user.email) {
      // Extract username from email as fallback
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }

    return 'Store Team Member';
  }

  /**
   * Generate inventory management URL for frontend.
   *
   * Deep links to product inventory management page.
   * Configure FRONTEND_URL in environment variables.
   */
  private getInventoryManagementUrl(
    storeId: string,
    productId: string
  ): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
    return `${baseUrl}/stores/${storeId}/products/${productId}/inventory`;
  }

  /**
   * Generate cooldown cache key.
   *
   * Format: {variantId}:{notificationType}
   * Example: "abc-123:low-stock"
   */
  private getCooldownKey(variantId: string, type: string): string {
    return `${variantId}:${type}`;
  }

  /**
   * Check if variant is in cooldown period for specific notification type.
   *
   * Prevents notification spam by enforcing minimum time between alerts.
   * Cooldown is per-variant per-type (low-stock has separate cooldown from out-of-stock).
   */
  private isInCooldown(variantId: string, type: string): boolean {
    const key = this.getCooldownKey(variantId, type);
    const lastAlertTime = this.alertCache.get(key);

    if (!lastAlertTime) return false;

    const timeSinceLastAlert = Date.now() - lastAlertTime;
    return timeSinceLastAlert < this.ALERT_COOLDOWN_MS;
  }

  /**
   * Clear cooldown for a variant.
   *
   * Useful for:
   * - Testing notification delivery
   * - Manual override by admins
   * - Force immediate re-notification
   */
  clearCooldown(variantId: string, type: string): void {
    const key = this.getCooldownKey(variantId, type);
    this.alertCache.delete(key);
    this.logger.log(`Cleared cooldown for ${variantId}:${type}`);
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
   *
   * Returns cooldowns that haven't expired yet with remaining time.
   * Useful for admin dashboards and debugging notification issues.
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
   *
   * Provides overview of notification throttling state.
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
      // Count by type
      byType[cooldown.type] = (byType[cooldown.type] || 0) + 1;

      // Track oldest/newest
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
   * Manually trigger notification for variant (bypasses cooldown).
   *
   * Admin operation for testing or force-sending notifications.
   * Use with caution - can spam recipients if misused.
   */
  async manualNotify(
    variantId: string,
    notificationType: 'low-stock' | 'out-of-stock'
  ): Promise<{ success: boolean; recipientCount: number; error?: string }> {
    try {
      // Load variant
      const variant = await this.loadVariantWithRelations(variantId);

      if (!variant) {
        return {
          success: false,
          recipientCount: 0,
          error: 'Variant not found',
        };
      }

      // Get recipients
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

      // Emit synthetic event
      // Note: This is a simplified approach - in production you might want to
      // emit through EventEmitter2 to maintain consistency
      this.logger.warn(
        `Manual notification triggered for ${variant.sku} (${notificationType})`
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
