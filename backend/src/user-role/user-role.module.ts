import { Module } from '@nestjs/common';
import { UserRoleRepository } from 'src/user-role/user-role.repository';
import { UserRoleService } from './user-role.service';

@Module({
  providers: [UserRoleRepository, UserRoleService],
})
export class UserRoleModule {}
