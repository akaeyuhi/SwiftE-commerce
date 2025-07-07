import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Inventory } from './inventory.entity';
import { CartItem } from './cart-item.entity';
import { OrderItem } from './order-item.entity';

@Entity({ name: 'product_variants' })
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @OneToMany(() => Inventory, (inv) => inv.variant)
  inventory: Inventory[];

  @OneToMany(() => CartItem, (item) => item.variant)
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, (item) => item.variant)
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
