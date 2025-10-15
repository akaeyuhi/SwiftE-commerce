import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';

@Entity({ name: 'product_variants' })
export class ProductVariant implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  product: Product;

  @Column({ type: 'varchar', length: 255, unique: true })
  sku: string;

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any>;

  @OneToOne(() => Inventory, (inv) => inv.variant)
  inventory: Inventory;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
