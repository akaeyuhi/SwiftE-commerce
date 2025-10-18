import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';
@Entity('confirmations')
@Index(['token'])
@Index(['userId', 'type'])
export class Confirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  email: string;

  @Column({ nullable: true, select: false })
  plainToken?: string;

  @Column({ unique: true })
  token: string;

  @Column({
    type: 'enum',
    enum: ConfirmationType,
  })
  type: ConfirmationType;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  usedAt?: Date;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
