export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  // Inventory notifications
  INVENTORY_LOW_STOCK = 'inventory_low_stock',
  INVENTORY_OUT_OF_STOCK = 'inventory_out_of_stock',
  INVENTORY_RESTOCKED = 'inventory_restocked',

  // Order notifications
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_REFUNDED = 'order_refunded',

  NEWS_PUBLISHED = 'news_published',

  // User notifications
  USER_WELCOME = 'user_welcome',
  USER_CONFIRMATION = 'user_confirmation',
  PASSWORD_RESET = 'password_reset',

  // Admin notifications
  ROLE_ASSIGNED = 'role_assigned',
  STORE_INVITATION = 'store_invitation',
}
