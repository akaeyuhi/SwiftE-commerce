import { Module } from '@nestjs/common';
import { UserRoleRepository } from 'src/modules/user-role/user-role.repository';
import { UserRoleService } from 'src/modules/user-role/user-role.service';

@Module({
  providers: [UserRoleRepository, UserRoleService],
})
export class UserRoleModule {}
