import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  InventoryNotificationCooldown,
  CooldownStats,
  NotificationType,
} from '../types/notification.types';

export class InventoryNotificationsService extends BaseService {
  /**
   * Get all cooldowns
   */
  async getCooldowns(): Promise<InventoryNotificationCooldown[]> {
    return this.client.get<InventoryNotificationCooldown[]>(
      API_ENDPOINTS.INVENTORY_NOTIFICATIONS.GET_COOLDOWNS
    );
  }

  /**
   * Get cooldown stats
   */
  async getStats(): Promise<CooldownStats> {
    return this.client.get<CooldownStats>(
      API_ENDPOINTS.INVENTORY_NOTIFICATIONS.GET_STATS
    );
  }

  /**
   * Clear specific cooldown
   */
  async clearCooldown(
    variantId: string,
    type: NotificationType
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.INVENTORY_NOTIFICATIONS.CLEAR_COOLDOWN, {
      variantId,
      type,
    });
    return this.client.delete<void>(url);
  }

  /**
   * Clear all cooldowns for a variant
   */
  async clearAllVariantCooldowns(variantId: string): Promise<void> {
    const url = buildUrl(
      API_ENDPOINTS.INVENTORY_NOTIFICATIONS.CLEAR_ALL_VARIANT,
      {
        variantId,
      }
    );
    return this.client.delete<void>(url);
  }

  /**
   * Manually trigger notification
   */
  async manualNotify(variantId: string, type: NotificationType): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.INVENTORY_NOTIFICATIONS.MANUAL_NOTIFY, {
      variantId,
      type,
    });
    return this.client.post<void>(url);
  }

  /**
   * Cleanup expired cooldowns
   */
  async cleanup(): Promise<{ deleted: number }> {
    return this.client.delete(API_ENDPOINTS.INVENTORY_NOTIFICATIONS.CLEANUP);
  }
}

export const inventoryNotificationsService =
  new InventoryNotificationsService();
