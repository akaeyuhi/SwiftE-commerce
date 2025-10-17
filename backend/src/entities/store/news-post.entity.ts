import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';

@Entity({ name: 'news_posts' })
export class NewsPost implements UserOwnedEntity, StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, (store) => store.newsPosts, {
    onDelete: 'SET NULL',
  })
  store: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @ManyToOne(() => User, (user) => user.newsPosts, { onDelete: 'SET NULL' })
  author: User;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
