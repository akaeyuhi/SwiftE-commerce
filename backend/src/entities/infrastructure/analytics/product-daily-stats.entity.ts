import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ProductDailyStats
 *
 * Per-product daily aggregates. Keep productId indexed.
 */
@Entity({ name: 'product_daily_stats' })
@Unique(['productId', 'date'])
export class ProductDailyStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  addToCarts: number;

  @Column({ type: 'int', default: 0 })
  purchases: number;

  @Column({ type: 'numeric', default: 0 })
  revenue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
