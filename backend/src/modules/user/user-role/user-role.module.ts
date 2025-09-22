import { Module } from '@nestjs/common';
import { UserRoleRepository } from 'src/modules/user/user-role/user-role.repository';
import { UserRoleService } from 'src/modules/user/user-role/user-role.service';

@Module({
  providers: [UserRoleRepository, UserRoleService],
  exports: [UserRoleService],
})
export class UserRoleModule {}
