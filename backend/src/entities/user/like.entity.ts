import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { Product } from 'src/entities/store/product/product.entity';

@Entity({ name: 'likes' })
@Unique(['user', 'product'])
@Unique(['user', 'store'])
export class Like implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.likes, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Product, (p) => p, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  product?: Product;

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
