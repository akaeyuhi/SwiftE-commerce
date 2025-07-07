import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ShoppingCart } from './cart.entity';
import { ProductVariant } from './variant.entity';

@Entity({ name: 'cart_items' })
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ShoppingCart, (cart) => cart.items, { onDelete: 'CASCADE' })
  cart: ShoppingCart;

  @ManyToOne(() => ProductVariant, (variant) => variant.cartItems, {
    onDelete: 'CASCADE',
  })
  variant: ProductVariant;

  @Column({ type: 'int' })
  quantity: number;
}
