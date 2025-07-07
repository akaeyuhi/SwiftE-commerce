import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserRole } from 'src/entities/user-role.entity';
import { Role } from 'src/entities/role.entity';
import { Store } from 'src/entities/store.entity';
import { UsersMapper } from 'src/modules/users/mappers/users.mapper';
import { UsersRepository } from 'src/modules/users/users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, Role, Store])],
  providers: [UsersRepository, UsersService, UsersMapper],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
