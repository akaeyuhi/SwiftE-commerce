import { Module } from '@nestjs/common';
import { AdminService } from 'src/modules/admin/admin.service';
import { AdminController } from 'src/modules/admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { AdminRepository } from 'src/modules/admin/admin.repository';
import {
  USER_REPOSITORY,
  USER_SERVICE,
} from 'src/common/contracts/admin.contract';
import { AdminUserService } from 'src/modules/admin/implementations/user.service';
import { AdminUserRepository } from 'src/modules/admin/implementations/user.repository';
import { User } from 'src/entities/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, User])],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRepository,
    { provide: USER_SERVICE, useExisting: AdminUserService },
    { provide: USER_REPOSITORY, useExisting: AdminUserRepository },
  ],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
