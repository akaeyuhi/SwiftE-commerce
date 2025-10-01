import { ObjectLiteral } from 'typeorm';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';

export interface NotificationLog extends ObjectLiteral {
  id: string;
  recipientId?: string;
  channel: NotificationChannel;
  notificationType: NotificationType;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  sentAt?: Date;
}

export interface NotificationPayload<Data = any> {
  recipient: string;
  recipientId?: string;
  notificationType: NotificationType;
  data: Data;
  priority?: number;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}
