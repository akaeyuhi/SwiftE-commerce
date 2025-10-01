import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/* @deprecated */
export class RoleDto {
  @IsUUID()
  @IsNotEmpty()
  storeId: string;
  @IsNotEmpty()
  roleName: StoreRoles;
  @IsUUID()
  @IsOptional()
  assignedBy?: string;
}
