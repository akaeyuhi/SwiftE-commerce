import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { UserRole } from './user-role.entity';
import { ShoppingCart } from './cart.entity';
import { NewsPost } from './news-post.entity';
import { AiLog } from './ai-log.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { Category } from 'src/entities/category.entity';
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';

@Entity({ name: 'store' })
export class Store implements UserOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  owner: User;

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

  @OneToMany(() => Order, (category) => category.store)
  categories: Category[];

  @OneToMany(() => ShoppingCart, (cart) => cart.store)
  carts: ShoppingCart[];

  @OneToMany(() => NewsPost, (post) => post.store)
  newsPosts: NewsPost[];

  @OneToMany(() => AiLog, (log) => log.store)
  aiLogs: AiLog[];

  @OneToMany(() => UserRole, (userRole) => userRole.store)
  userRoles: UserRole[];
}
