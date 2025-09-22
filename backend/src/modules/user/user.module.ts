import { forwardRef, Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { UserController } from 'src/modules/user/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user/user.entity';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { Store } from 'src/entities/store/store.entity';
import { UserMapper } from 'src/modules/user/user.mapper';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserRoleModule } from 'src/modules/user/user-role/user-role.module';
import { StoreModule } from 'src/modules/store/store.module';
import { USER_SERVICE } from 'src/common/contracts/policy.contract';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Store]),
    UserRoleModule,
    StoreModule,
    AuthModule,
  ],
  providers: [
    UserRepository,
    UserService,
    {
      provide: USER_SERVICE,
      useExisting: UserService,
    },
    UserMapper,
  ],
  controllers: [UserController],
  exports: [UserService, USER_SERVICE],
})
export class UserModule {}
