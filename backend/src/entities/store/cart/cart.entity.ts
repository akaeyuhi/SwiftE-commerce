import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Column,
  Index,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';

@Entity({ name: 'shopping_carts' })
@Unique(['user', 'store'])
@Index(['expiresAt'])
export class ShoppingCart implements UserOwnedEntity, StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.carts, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Store, (store) => store.carts, { onDelete: 'CASCADE' })
  store: Store;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];

  // Auto-cleanup abandoned carts after 30 days
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
