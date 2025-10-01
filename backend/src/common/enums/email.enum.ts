export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

export enum EmailPriority {
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BULK = 5,
}

export enum EmailProvider {
  SMTP = 'smtp',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  AWS_SES = 'aws_ses',
}

export enum EmailJobType {
  // Authentication
  USER_CONFIRMATION = 'user_confirmation',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  ROLE_CONFIRMATION = 'role_confirmation',

  // Orders
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',

  // News
  NEWS_PUBLISHED = 'news_published',

  // Inventory
  STOCK_ALERT = 'stock_alert',
  LOW_STOCK_WARNING = 'low_stock_warning',

  // Marketing
  NEWSLETTER = 'newsletter',
  MARKETING = 'marketing',

  // General
  NOTIFICATION = 'notification',
}
