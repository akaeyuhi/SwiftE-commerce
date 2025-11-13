export interface SendEmailRequest {
  to: string;
  subject: string;
  template?: string;
  data?: Record<string, any>;
}

export interface UserConfirmationEmailRequest {
  userId: string;
  email: string;
  type: 'email' | 'role';
}

export interface StockAlertEmailRequest {
  variantId: string;
  productName: string;
  currentStock: number;
  adminEmails: string[];
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
