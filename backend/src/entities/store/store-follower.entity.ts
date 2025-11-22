import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';

/**
 * StoreFollower
 *
 * Tracks users who follow a store for news updates.
 * Users who follow a store receive email notifications for new posts.
 */
@Entity('store_followers')
@Index(['user', 'store'], { unique: true })
export class StoreFollower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ referencedColumnName: 'id', name: 'user_id' })
  user: User;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ referencedColumnName: 'id', name: 'store_id' })
  store: Store;

  @Column({ type: 'uuid', name: 'store_id' })
  storeId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @CreateDateColumn()
  followedAt: Date;
}
