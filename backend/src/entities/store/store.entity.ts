import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  DeleteDateColumn,
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
import { ApiProperty } from '@nestjs/swagger';

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

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  bannerUrl?: string;

  @Column({ name: 'owner_id', type: 'uuid' })
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

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relations
  @OneToMany(() => Product, (product) => product.store, {
    cascade: ['update', 'remove'],
  })
  @ApiProperty({
    type: () => [Product],
    required: false,
  })
  products: Product[];

  @OneToMany(() => Inventory, (inventory) => inventory.store, {
    cascade: ['update', 'remove'],
  })
  inventories: Inventory[];

  @OneToMany(() => Order, (order) => order.store, {
    cascade: ['update', 'remove'],
  })
  orders: Order[];

  @OneToMany(() => Category, (category) => category.store, {
    cascade: ['update', 'remove'],
    eager: true,
  })
  @ApiProperty({
    type: () => [Category],
    required: false,
  })
  categories: Category[];

  @OneToMany(() => ShoppingCart, (cart) => cart.store, {
    cascade: ['update', 'remove'],
  })
  carts: ShoppingCart[];

  @OneToMany(() => NewsPost, (post) => post.store, {
    cascade: ['update', 'remove'],
  })
  newsPosts: NewsPost[];

  @OneToMany(() => AiLog, (log) => log.store, {
    cascade: ['update', 'remove'],
  })
  aiLogs: AiLog[];

  @OneToMany(() => StoreRole, (userRole) => userRole.store, {
    cascade: ['update', 'remove'],
  })
  storeRoles: StoreRole[];
}
