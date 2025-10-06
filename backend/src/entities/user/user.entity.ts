import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
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
export class User implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'text' })
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

  @OneToMany(() => Store, (store) => store.owner)
  ownedStores: Store[];

  @OneToMany(() => StoreRole, (ur) => ur.user)
  roles: StoreRole[];

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

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];
}
