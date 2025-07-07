import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';

@Entity({ name: 'ai_logs' })
export class AiLog {
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
}
