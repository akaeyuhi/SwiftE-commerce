import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { ShoppingCart } from './cart.entity';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { NewsPost } from './news-post.entity';
import { AiLog } from './ai-log.entity';
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';

@Entity({ name: 'users' })
export class User implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'text' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserRole, (ur) => ur.user)
  roles: UserRole[];

  @OneToMany(() => ShoppingCart, (cart) => cart.user)
  carts: ShoppingCart[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => NewsPost, (post) => post.author)
  newsPosts: NewsPost[];

  @OneToMany(() => AiLog, (log) => log.user)
  aiLogs: AiLog[];
}
