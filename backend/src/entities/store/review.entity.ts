import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';

@Entity({ name: 'reviews' })
@Index(['productId', 'rating', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['productId', 'userId'], { unique: true })
export class Review implements UserOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.reviews, {
    onDelete: 'CASCADE',
  })
  product: Product;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
