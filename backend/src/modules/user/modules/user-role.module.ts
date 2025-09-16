import { Module } from '@nestjs/common';
import { UserRoleRepository } from 'src/modules/user/modules/user-role.repository';
import { UserRoleService } from 'src/modules/user/modules/user-role.service';

@Module({
  providers: [UserRoleRepository, UserRoleService],
})
export class UserRoleModule {}
