import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';

import { GuardUserRepository } from 'src/modules/authorization/guard-services/repositories/guard-user.repository';
import { GuardStoreRepository } from 'src/modules/authorization/guard-services/repositories/guard-store.repository';
import { GuardAdminRepository } from 'src/modules/authorization/guard-services/repositories/guard-admin.repository';
import { GuardUserService } from 'src/modules/authorization/guard-services/services/guard-user.service';
import { GuardStoreService } from 'src/modules/authorization/guard-services/services/guard-store.service';
import { GuardAdminService } from 'src/modules/authorization/guard-services/services/guard-admin.service';
import {
  IAdminService,
  IStoreService,
  IUserService,
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
    { provide: IUserService, useClass: GuardUserService },
    { provide: IAdminService, useClass: GuardAdminService },
    { provide: IStoreService, useClass: GuardStoreService },
  ],
  exports: [IUserService, IAdminService, IStoreService],
})
export class GuardServicesModule {}
