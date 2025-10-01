import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateStoreRoleDto {
  @IsOptional()
  user?: User;
  @IsOptional()
  store?: Store;
  @IsUUID()
  userId?: string;
  @IsUUID()
  storeId?: string;
  @IsEnum(StoreRoles)
  roleName: StoreRoles;
  @IsUUID()
  @IsOptional()
  assignedBy?: string;
  @IsDate()
  @IsOptional()
  assignedAt?: Date;
  isActive?: boolean;
}
