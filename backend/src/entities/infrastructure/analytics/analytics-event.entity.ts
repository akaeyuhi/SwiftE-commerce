import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AnalyticsEventType {
  VIEW = 'view',
  LIKE = 'like',
  UNLIKE = 'unlike',
  ADD_TO_CART = 'addToCart',
  PURCHASE = 'purchase',
  CHECKOUT = 'checkout',
  CLICK = 'click',
  CUSTOM = 'custom',
}

@Entity({ name: 'analytics_events' })
@Index(['storeId', 'eventType', 'createdAt'], {
  where: 'store_id IS NOT NULL',
})
@Index(['productId', 'eventType', 'createdAt'], {
  where: 'product_id IS NOT NULL',
})
@Index(['userId', 'eventType', 'createdAt'], {
  where: 'user_id IS NOT NULL',
})
@Index(['createdAt']) // For partitioning and cleanup
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
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

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  value?: number;

  @Column({ type: 'varchar', length: 50 })
  invokedOn: 'store' | 'product';

  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
