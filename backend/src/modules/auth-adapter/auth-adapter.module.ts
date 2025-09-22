import { forwardRef, Module } from '@nestjs/common';
import {
  USER_SERVICE,
  STORE_SERVICE,
  ADMIN_SERVICE,
} from 'src/common/contracts/policy.contract';

import { UserModule } from 'src/modules/user/user.module';
import { StoreModule } from 'src/modules/store/store.module';
import { AdminModule } from 'src/modules/auth/admin/admin.module';

import { UserService } from 'src/modules/user/user.service';
import { StoreService } from 'src/modules/store/store.service';
import { AdminService } from 'src/modules/auth/admin/admin.service';

/**
 * AuthAdaptersModule
 *
 * Provides small adapter providers (tokens) that expose only the methods the
 * PolicyService/guards need. Each adapter delegates to the full domain service.
 *
 * This prevents importing large services directly into PolicyService and reduces
 * circular dependency surface.
 */
@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => StoreModule),
    forwardRef(() => AdminModule),
  ],
  providers: [
    {
      provide: USER_SERVICE,
      useFactory: (userService: UserService) => ({
        getUserStoreRoles: (userId: string) =>
          userService.getUserStoreRoles(userId),
        isUserSiteAdmin: (userId: string) =>
          userService.isUserSiteAdmin(userId),
      }),
      inject: [UserService],
    },
    {
      provide: USER_SERVICE,
      useFactory: (storeService: StoreService) => ({
        hasUserStoreRole: (roleRecord: any) =>
          storeService.hasUserStoreRole
            ? storeService.hasUserStoreRole(roleRecord)
            : Promise.resolve(true),
        findOne: (storeId: string) =>
          storeService.getEntityById
            ? storeService.getEntityById(storeId)
            : storeService.findOne
              ? storeService.findOne(storeId)
              : Promise.resolve(null),
      }),
      inject: [StoreService],
    },
    {
      provide: STORE_SERVICE,
      useFactory: (storeService: StoreService) => ({
        hasUserStoreRole: (roleRecord: any) =>
          storeService.hasUserStoreRole
            ? storeService.hasUserStoreRole(roleRecord)
            : Promise.resolve(true),
        findOne: (storeId: string) =>
          storeService.getEntityById
            ? storeService.getEntityById(storeId)
            : storeService.findOne
              ? storeService.findOne(storeId)
              : Promise.resolve(null),
      }),
      inject: [StoreService],
    },
    {
      provide: ADMIN_SERVICE,
      useFactory: (adminService: AdminService) => ({
        isUserValidAdmin: (userId: string) =>
          adminService.isUserValidAdmin
            ? adminService.isUserValidAdmin(userId)
            : Promise.resolve(false),
      }),
      inject: [AdminService],
    },
  ],
  exports: [USER_SERVICE, STORE_SERVICE, ADMIN_SERVICE],
})
export class AuthAdapterModule {}
