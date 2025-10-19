export interface InventoryNotificationCooldown {
  variantId: string;
  type: 'low_stock' | 'out_of_stock';
  lastNotifiedAt: string;
  cooldownUntil: string;
  notificationCount: number;
}

export interface CooldownStats {
  total: number;
  byType: {
    low_stock: number;
    out_of_stock: number;
  };
  expired: number;
  active: number;
}

export type NotificationType = 'low_stock' | 'out_of_stock';
