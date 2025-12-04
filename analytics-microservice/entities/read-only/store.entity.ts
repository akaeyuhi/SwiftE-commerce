import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Read-Only Store Entity
 * Maps to the existing 'stores' table.
 * Stripped of relationships (User, Products, etc.) to prevent dependency bloat.
 */
@Entity({ name: 'stores', synchronize: false }) // synchronize: false is CRITICAL
export class Store {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Only include columns needed for calculations
  @Column({ type: 'int', default: 0 })
  productCount: number;

  @Column({ type: 'int', default: 0 })
  followerCount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'int', default: 0 })
  orderCount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  conversionRate: number;
}
