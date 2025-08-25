import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
} from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

@Entity({ name: 'user_roles' })
export class UserRole {
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

  @ManyToOne(() => Store, (store) => store.userRoles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  store: Store;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
