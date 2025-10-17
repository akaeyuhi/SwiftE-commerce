import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';

@Entity({ name: 'user_roles' })
export class StoreRole implements UserOwnedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: StoreRoles,
    default: StoreRoles.GUEST,
  })
  roleName: StoreRoles;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Store, (store) => store.storeRoles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  store: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
}
