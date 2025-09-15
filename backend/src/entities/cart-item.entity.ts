import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShoppingCart } from './cart.entity';
import { ProductVariant } from './variant.entity';
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';

@Entity({ name: 'cart_items' })
export class CartItem implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ShoppingCart, (cart) => cart.items, { onDelete: 'CASCADE' })
  cart: ShoppingCart;

  variant: ProductVariant;

  @Column({ type: 'int' })
  quantity: number = 1;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
