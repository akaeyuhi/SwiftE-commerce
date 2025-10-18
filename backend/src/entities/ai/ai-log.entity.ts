import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';

@Entity({ name: 'ai_logs' })
export class AiLog implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.aiLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: User;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.aiLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  store?: Store;

  @Column({ type: 'varchar', length: 100 })
  feature: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
