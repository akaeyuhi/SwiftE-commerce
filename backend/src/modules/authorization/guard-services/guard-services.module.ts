import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';

import { GuardUserRepository } from 'src/modules/authorization/guard-services/repositories/guard-user.repository';
import { GuardStoreRepository } from 'src/modules/authorization/guard-services/repositories/guard-store.repository';
import { GuardAdminRepository } from 'src/modules/authorization/guard-services/repositories/guard-admin.repository';
import { GuardUserService } from 'src/modules/authorization/guard-services/services/guard-user.service';
import { GuardStoreService } from 'src/modules/authorization/guard-services/services/guard-store.service';
import { GuardAdminService } from 'src/modules/authorization/guard-services/services/guard-admin.service';
import {
  ADMIN_SERVICE,
  STORE_SERVICE,
  USER_SERVICE,
} from 'src/common/contracts/policy.contract';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Store, Admin, StoreRole])],
  providers: [
    GuardUserRepository,
    GuardStoreRepository,
    GuardAdminRepository,
    GuardUserService,
    GuardStoreService,
    GuardAdminService,
    { provide: USER_SERVICE, useExisting: GuardUserService },
    { provide: ADMIN_SERVICE, useExisting: GuardAdminService },
    { provide: STORE_SERVICE, useExisting: GuardStoreService },
  ],
  exports: [USER_SERVICE, ADMIN_SERVICE, STORE_SERVICE],
})
export class GuardServicesModule {}
