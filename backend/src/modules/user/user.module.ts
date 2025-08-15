import { Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { UserController } from 'src/modules/user/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserRole } from 'src/entities/user-role.entity';
import { Role } from 'src/entities/role.entity';
import { Store } from 'src/entities/store.entity';
import { UserMapper } from 'src/modules/user/mappers/user.mapper';
import { UserRepository } from 'src/modules/user/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, Role, Store])],
  providers: [UserRepository, UserService, UserMapper],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
