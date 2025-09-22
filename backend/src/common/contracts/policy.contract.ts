import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { StoreDto } from 'src/modules/store/dto/store.dto';

export const USER_SERVICE = 'USER_SERVICE';
export const STORE_SERVICE = 'STORE_SERVICE';
export const ADMIN_SERVICE = 'ADMIN_SERVICE';

export interface IUserService {
  getUserStoreRoles(userId: string): Promise<UserRole[]>;
  isUserSiteAdmin(userId: string): Promise<boolean>;
}

export interface IStoreService {
  hasUserStoreRole(userRole: UserRole): Promise<boolean>;
  findOne(storeId: string): Promise<StoreDto>;
}

export interface IAdminService {
  isUserValidAdmin(userId: string): Promise<boolean>;
}
