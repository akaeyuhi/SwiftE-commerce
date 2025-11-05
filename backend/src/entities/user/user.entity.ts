import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { Review } from 'src/entities/store/review.entity';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { AiLog } from 'src/entities/ai/ai-log.entity';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { Store } from 'src/entities/store/store.entity';
import { Like } from 'src/entities/user/like.entity';
import { Exclude } from 'class-transformer';

@Entity({ name: 'users' })
@Index(['email'])
@Index(['isActive', 'createdAt'])
export class User implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'text', select: false })
  @Exclude()
  passwordHash: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerifiedAt?: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  deactivatedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: AdminRoles,
    default: AdminRoles.USER,
  })
  siteRole: AdminRoles;

  // Relations

  @OneToMany(() => Store, (store) => store.owner, { cascade: true })
  ownedStores: Store[];

  @OneToMany(() => StoreRole, (sr) => sr.user, { cascade: true })
  roles: StoreRole[];

  @OneToMany(() => ShoppingCart, (cart) => cart.user, { cascade: true })
  carts: ShoppingCart[];

  @OneToMany(() => Order, (order) => order.user, { cascade: true })
  orders: Order[];

  @OneToMany(() => Review, (review) => review.user, { cascade: true })
  reviews: Review[];

  @OneToMany(() => NewsPost, (post) => post.author, { cascade: true })
  newsPosts: NewsPost[];

  @OneToMany(() => AiLog, (log) => log.user, { cascade: true })
  aiLogs: AiLog[];

  @OneToMany(() => Like, (like) => like.user, { cascade: true })
  likes: Like[];
}
