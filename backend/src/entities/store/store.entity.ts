import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';

@Entity({ name: 'stores' })
@Index(['name'])
@Index(['ownerId', 'createdAt'])
export class Store implements UserOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.ownedStores, { onDelete: 'SET NULL' })
  owner: User;

  // Cached/denormalized fields for performance
  @Column({ type: 'int', default: 0 })
  productCount: number;

  @Column({ type: 'int', default: 0 })
  followerCount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'int', default: 0 })
  orderCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  @OneToMany(() => Inventory, (inventory) => inventory.store)
  inventories: Inventory[];

  @OneToMany(() => Order, (order) => order.store)
  orders: Order[];

  @OneToMany(() => Category, (category) => category.store)
  categories: Category[];

  @OneToMany(() => ShoppingCart, (cart) => cart.store)
  carts: ShoppingCart[];

  @OneToMany(() => NewsPost, (post) => post.store)
  newsPosts: NewsPost[];

  @OneToMany(() => AiLog, (log) => log.store)
  aiLogs: AiLog[];

  @OneToMany(() => StoreRole, (userRole) => userRole.store)
  storeRoles: StoreRole[];
}
