import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Read-Only Product Entity
 * Maps to the existing 'products' table.
 */
@Entity({ name: 'products', synchronize: false })
export class Product {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  // Stats columns required by QuickStatsService
  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  averageRating?: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  totalSales: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;
}
