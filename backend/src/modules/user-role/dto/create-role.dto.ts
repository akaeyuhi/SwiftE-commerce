import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { User } from 'src/entities/user.entity';
import { Store } from 'src/entities/store.entity';

export class CreateUserRoleDto {
  roleName: StoreRoles;
  user: User;
  store: Store;
}
