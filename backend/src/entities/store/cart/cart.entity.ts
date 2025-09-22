import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/store-owned.entity.interface';

@Entity({ name: 'shopping_carts' })
@Unique(['user', 'store'])
export class ShoppingCart implements UserOwnedEntity, StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.carts, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Store, (store) => store.carts, { onDelete: 'CASCADE' })
  store: Store;

  @OneToMany(() => CartItem, (item) => item.cart)
  items: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
