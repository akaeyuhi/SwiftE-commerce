import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { IsEnum } from 'class-validator';

export class CreateUserRoleDto {
  @IsEnum(StoreRoles) roleName: StoreRoles;
  user: User;
  store: Store;
}
