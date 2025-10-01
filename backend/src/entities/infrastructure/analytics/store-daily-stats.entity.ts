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
 * StoreDailyStats
 *
 * Daily aggregated counters per store. Keep it wide and simple; you can extend with more columns.
 */
@Entity({ name: 'store_daily_stats' })
@Unique(['storeId', 'date'])
export class StoreDailyStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  storeId: string;

  /** Date (UTC) representing the day for the aggregated counters (no time) */
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

  @Column({ type: 'int', default: 0 })
  checkouts: number;

  // You may store sums like revenue
  @Column({ type: 'numeric', default: 0 })
  revenue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
