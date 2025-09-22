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
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';

@Entity({ name: 'user_roles' })
export class UserRole implements UserOwnedEntity {
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

  @UpdateDateColumn()
  updatedAt: Date;
}
