import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationLog } from 'src/common/interfaces/infrastructure/notification.interface';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';

/**
 * InventoryNotificationLog
 *
 * Audit log for inventory-related notifications.
 * Tracks delivery attempts, status, and metadata for compliance and debugging.
 */
@Entity('inventory_notification_logs')
@Index(['storeId', 'createdAt'])
@Index(['variantId', 'notificationType', 'status'])
export class InventoryNotificationLog implements NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ type: 'uuid' })
  variantId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column()
  recipient: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  notificationType: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;
}
