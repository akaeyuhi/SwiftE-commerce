import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
  Index,
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

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  store: Store;

  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @CreateDateColumn()
  followedAt: Date;
}
