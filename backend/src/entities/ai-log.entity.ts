import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { BaseEntity } from 'src/common/interfaces/base-entity.interface';

@Entity({ name: 'ai_logs' })
export class AiLog implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.aiLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: User;

  @ManyToOne(() => Store, (store) => store.aiLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  store?: Store;

  @Column({ type: 'varchar', length: 100 })
  feature: string; // e.g., 'product_description_generator'

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
