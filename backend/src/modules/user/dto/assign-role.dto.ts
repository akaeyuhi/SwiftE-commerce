import { IsNotEmpty } from 'class-validator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

export class AssignRoleDto {
  @IsNotEmpty()
  storeId: string;
  @IsNotEmpty()
  roleName: StoreRoles;
}
