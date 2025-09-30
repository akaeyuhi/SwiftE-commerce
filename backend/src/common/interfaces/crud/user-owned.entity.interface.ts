import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';
import { User } from 'src/entities/user/user.entity';

export interface UserOwnedEntity extends BaseEntity {
  user?: User;
  author?: User;
  owner?: User;
}
