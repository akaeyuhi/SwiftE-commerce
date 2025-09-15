import { BaseEntity } from 'src/common/interfaces/base-entity.interface';
import { User } from 'src/entities/user.entity';

export interface UserOwnedEntity extends BaseEntity {
  user?: User;
  author?: User;
  owner?: User;
}
