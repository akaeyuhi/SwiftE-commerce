import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { User } from './user.entity';
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/store-owned.entity.interface';

@Entity({ name: 'news_posts' })
export class NewsPost implements UserOwnedEntity, StoreOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Store, (store) => store.newsPosts, {
    onDelete: 'SET NULL',
  })
  store: Store;

  @ManyToOne(() => User, (user) => user.newsPosts, { onDelete: 'SET NULL' })
  author: User;

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
