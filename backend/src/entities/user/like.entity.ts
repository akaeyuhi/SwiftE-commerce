import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Column,
  JoinColumn,
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

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @Column({ name: 'product_id', nullable: true, type: 'uuid' })
  productId?: string;

  @ManyToOne(() => Product, (p) => p, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product?: Product;

  @Column({ name: 'store_id', nullable: true, type: 'uuid' })
  storeId?: string;

  @ManyToOne(() => Store, (s) => s, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store?: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
