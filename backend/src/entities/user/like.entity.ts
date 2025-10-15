import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Column,
} from 'typeorm';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { Product } from 'src/entities/store/product/product.entity';

@Entity({ name: 'likes' })
@Unique(['user', 'product'])
@Unique(['user', 'store'])
export class Like implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.likes, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'product_id', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, (p) => p, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  product?: Product;

  @Column({ name: 'store_id', nullable: true })
  storeId?: string;

  @ManyToOne(() => Store, (s) => s, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  store?: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
