import { Module } from '@nestjs/common';
import { AdminService } from 'src/modules/admin/admin.service';
import { AdminController } from 'src/modules/admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { AdminRepository } from 'src/modules/admin/admin.repository';
import {
  IUserRepository,
  IUserService,
} from 'src/common/contracts/admin.contract';
import { AdminUserService } from 'src/modules/admin/implementations/user.service';
import { AdminUserRepository } from 'src/modules/admin/implementations/user.repository';
import { User } from 'src/entities/user/user.entity';
import { StoreModule } from 'src/modules/store/store.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User]),
    StoreModule,
    OrdersModule,
    UserModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRepository,
    { provide: IUserService, useClass: AdminUserService },
    { provide: IUserRepository, useClass: AdminUserRepository },
  ],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
