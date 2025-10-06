import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { Admin } from 'src/entities/user/authentication/admin.entity';

export const IUserService = Symbol('USER_POLICY_SERVICE');
export const IStoreService = Symbol('STORE_POLICY_SERVICE');
export const IAdminService = Symbol('ADMIN_POLICY_SERVICE');

export interface IUserService {
  getUserStoreRoles(userId: string): Promise<StoreRole[]>;
  isUserSiteAdmin(userId: string): Promise<boolean>;
  isActive(storeId: string): Promise<boolean>;
}

export interface IStoreService {
  hasUserStoreRole(userRole: StoreRole): Promise<boolean>;
  findOne(storeId: string): Promise<StoreDto>;
}

export interface IAdminService {
  isUserValidAdmin(userId: string): Promise<boolean>;
}

export interface IStoreRepository {
  findById(storeId: string): Promise<Store | null>;
}

export interface IAdminRepository {
  findOne(storeId: string): Promise<Admin | null>;
}

export interface IUserRepository {
  findOneWithRelations(id: string): Promise<User | null>;
}
