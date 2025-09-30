import { EmailPriority } from 'src/modules/email/enums/email.enum';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailData {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  from?: EmailRecipient; // Added this property
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: EmailPriority;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string; // Content ID for inline images
}

export interface EmailProvider {
  name: string;
  send(emailData: EmailData): Promise<EmailSendResult>;
  healthCheck(): Promise<boolean>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  sentAt: Date;
  metadata?: Record<string, any>;
}

export interface EmailJobData {
  type: EmailJobType;
  emailData: EmailData;
  userId?: string;
  storeId?: string;
  attempts?: number;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export enum EmailJobType {
  USER_CONFIRMATION = 'user_confirmation',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  STOCK_ALERT = 'stock_alert',
  LOW_STOCK_WARNING = 'low_stock_warning',
  ORDER_CONFIRMATION = 'order_confirmation',
  SHIPPING_NOTIFICATION = 'shipping_notification',
  PROMOTIONAL = 'promotional',
  NEWSLETTER = 'newsletter',
  CUSTOM = 'custom',
}
