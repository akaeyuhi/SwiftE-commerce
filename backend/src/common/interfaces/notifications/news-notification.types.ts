import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';

/**
 * News notification data
 */
export interface NewsNotificationData {
  newsId: string;
  storeId: string;
  storeName: string;
  title: string;
  content: string;
  excerpt: string;
  authorName: string;
  publishedAt: string;
  newsUrl: string;
  coverImageUrl?: string;
  category?: string;
  unsubscribeUrl: string;
}

/**
 * Type alias for news notification payload
 */
export type NewsNotificationPayload = NotificationPayload<NewsNotificationData>;
