import { Module } from '@nestjs/common';
import { AdminService } from 'src/modules/admin/admin.service';
import { AdminController } from 'src/modules/admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { AdminRepository } from 'src/modules/admin/admin.repository';
import {
  IOrderService,
  IStoreService,
  IUserRepository,
  IUserService,
} from 'src/common/contracts/admin.contract';
import { AdminUserService } from 'src/modules/admin/implementations/user.service';
import { AdminUserRepository } from 'src/modules/admin/implementations/user.repository';
import { User } from 'src/entities/user/user.entity';
import { AdminStoreService } from 'src/modules/admin/implementations/store.service';
import { AdminOrdersService } from 'src/modules/admin/implementations/order.service';
import { Store } from 'src/entities/store/store.entity';
import { Order } from 'src/entities/store/product/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, User, Store, Order])],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRepository,
    { provide: IUserService, useClass: AdminUserService },
    { provide: IUserRepository, useClass: AdminUserRepository },
    { provide: IStoreService, useClass: AdminStoreService },
    { provide: IOrderService, useClass: AdminOrdersService },
  ],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
