import { Module } from '@nestjs/common';
import { UserRoleRepository } from 'src/modules/user/modules/user-role.repository';
import { UserRoleService } from 'src/modules/user/modules/user-role.service';

@Module({
  providers: [UserRoleRepository, UserRoleService],
  exports: [UserRoleService],
})
export class UserRoleModule {}
