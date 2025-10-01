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
  USER_CONFIRMATION = 'USER_CONFIRMATION',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ROLE_CONFIRMATION = 'ROLE_CONFIRMATION',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  STOCK_ALERT = 'STOCK_ALERT',
  LOW_STOCK_WARNING = 'LOW_STOCK_WARNING',
  NEWSLETTER = 'NEWSLETTER',
  MARKETING = 'MARKETING',
  NOTIFICATION = 'NOTIFICATION',
}
