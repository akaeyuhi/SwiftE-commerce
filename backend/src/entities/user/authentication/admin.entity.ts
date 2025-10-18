import {
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  assignedBy?: string;

  @Column({ nullable: true })
  assignedAt?: Date;

  @Column({ nullable: true })
  revokedBy?: string;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
