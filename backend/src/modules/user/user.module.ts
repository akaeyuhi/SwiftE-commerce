import { Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { UserController } from 'src/modules/user/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user/user.entity';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { Store } from 'src/entities/store/store.entity';
import { UserMapper } from 'src/modules/user/user.mapper';
import { UserRepository } from 'src/modules/user/user.repository';
import { StoreRoleModule } from 'src/modules/store/store-role/store-role.module';
import { StoreModule } from 'src/modules/store/store.module';
import { LikesModule } from './likes/likes/likes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StoreRole, Store]),
    StoreRoleModule,
    StoreModule,
    LikesModule,
  ],
  providers: [UserRepository, UserService, UserMapper],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
