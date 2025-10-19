import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  SendEmailRequest,
  UserConfirmationEmailRequest,
  StockAlertEmailRequest,
  QueueStats,
} from '../types/email.types';

export class EmailService extends BaseService {
  /**
   * Send generic email
   */
  async sendEmail(data: SendEmailRequest): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.EMAIL.SEND, data);
  }

  /**
   * Send user confirmation email
   */
  async sendUserConfirmation(
    data: UserConfirmationEmailRequest
  ): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.EMAIL.USER_CONFIRMATION, data);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userId: string, email: string): Promise<void> {
    return this.client.post<void>(API_ENDPOINTS.EMAIL.WELCOME, {
      userId,
      email,
    });
  }

  /**
   * Send stock alert
   */
  async sendStockAlert(
    storeId: string,
    data: StockAlertEmailRequest
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.EMAIL.STOCK_ALERT, { storeId });
    return this.client.post<void>(url, data);
  }

  /**
   * Send low stock warning
   */
  async sendLowStockWarning(
    storeId: string,
    data: StockAlertEmailRequest
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.EMAIL.LOW_STOCK_WARNING, { storeId });
    return this.client.post<void>(url, data);
  }

  /**
   * Get email system health
   */
  async getHealth(): Promise<{ status: string; queue: QueueStats }> {
    return this.client.get(API_ENDPOINTS.EMAIL.HEALTH);
  }

  /**
   * Get email queue stats
   */
  async getQueueStats(): Promise<QueueStats> {
    return this.client.get<QueueStats>(API_ENDPOINTS.EMAIL.QUEUE_STATS);
  }
}

export const emailService = new EmailService();
