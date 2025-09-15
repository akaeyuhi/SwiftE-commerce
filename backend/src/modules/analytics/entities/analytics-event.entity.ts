import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * AnalyticsEvent
 *
 * Append-only event store for analytics. Small and index-friendly.
 * We intentionally store a superset of fields so events can be flexible.
 */
export enum AnalyticsEventType {
  VIEW = 'view',
  LIKE = 'like',
  ADD_TO_CART = 'add_to_cart',
  PURCHASE = 'purchase',
  CHECKOUT = 'checkout',
  IMPRESSION = 'impression',
  CLICK = 'click',
  CUSTOM = 'custom',
}

@Entity({ name: 'analytics_events' })
@Index(['storeId', 'productId', 'eventType', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // optional foreign key-ish ids (store/product/user may be null for anonymous events)
  @Column({ type: 'uuid', nullable: true })
  storeId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: AnalyticsEventType;

  // Generic numeric payload (e.g. value for purchase)
  @Column({ type: 'numeric', nullable: true })
  value?: number;

  // small JSON payload for additional context (browser, referrer, utm, etc.)
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
