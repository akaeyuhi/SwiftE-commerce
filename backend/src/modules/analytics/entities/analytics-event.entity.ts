import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AdminRoles } from 'src/common/enums/admin.enum';

/**
 * AnalyticsEvent
 *
 * Append-only event store for analytics. Small and index-friendly.
 * We intentionally store a superset of fields so events can be flexible.
 */
export enum AnalyticsEventType {
  VIEW = 'view',
  LIKE = 'like',
  UNLIKE = 'unlike',
  ADD_TO_CART = 'add_to_cart',
  PURCHASE = 'purchase',
  CHECKOUT = 'checkout',
  CLICK = 'click',
  CUSTOM = 'custom',
}

@Entity({ name: 'analytics_events' })
@Index(['storeId', 'productId', 'eventType', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
    default: AnalyticsEventType.CUSTOM,
  })
  eventType: AnalyticsEventType;

  @Column({ type: 'numeric', nullable: true })
  value?: number;

  @Column({ type: 'varchar', length: 50 })
  invokedOn: 'store' | 'product';

  // small JSON payload for additional context (browser, referrer, utm, etc.)
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
