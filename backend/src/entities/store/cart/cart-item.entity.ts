import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index, OneToOne, JoinColumn,
} from 'typeorm';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';

@Entity({ name: 'cart_items' })
@Index(['cartId', 'variantId'], { unique: true })
@Index(['variantId'])
export class CartItem implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cart_id' })
  cartId: string;

  @ManyToOne(() => ShoppingCart, (cart) => cart.items, { onDelete: 'CASCADE' })
  cart: ShoppingCart;

  @Column({ name: 'variant_id' })
  variantId: string;

  @OneToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id', referencedColumnName: 'id' })
  variant: ProductVariant;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
