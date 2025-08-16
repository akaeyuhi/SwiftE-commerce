import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // store digest (sha256) of token for safety
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  tokenHash: string;

  @ManyToOne(() => User, (u) => u.aiLogs, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  isBanned: boolean;

  // Device / session metadata
  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ip?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
