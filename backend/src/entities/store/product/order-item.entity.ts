import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';

/**
 * OrderItem
 *
 * Represents a single purchased line within an order. This entity stores
 * a snapshot of product/variant details (name, sku, unitPrice) so the
 * order remains historically accurate even after product updates.
 */
@Entity({ name: 'order_items' })
export class OrderItem implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  /** Optional FK to Product for convenience (not required for record integrity) */
  @ManyToOne(() => Product, { nullable: true })
  product?: Product;

  @Column({ name: 'variant_id', nullable: true, type: 'uuid' })
  variantId?: string;

  /** Optional FK to ProductVariant for convenience */
  @ManyToOne(() => ProductVariant, { nullable: true })
  variant?: ProductVariant;

  /** Snapshot of product name at time of order */
  @Column({ type: 'varchar', length: 255 })
  productName: string;

  /** Snapshot of variant SKU (if applicable) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  sku?: string;

  /** Unit price snapshot (numeric for accuracy) */
  @Column({ type: 'numeric' })
  unitPrice: number;

  /** Quantity purchased */
  @Column({ type: 'int' })
  quantity: number;

  /** Line total (unitPrice * quantity) stored for convenience */
  @Column({ type: 'numeric' })
  lineTotal: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
