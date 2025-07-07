import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Store } from './store.entity';

@Entity({ name: 'user_roles' })
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles, { onDelete: 'CASCADE' })
  role: Role;

  @ManyToOne(() => Store, (store) => store.userRoles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  store?: Store;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
