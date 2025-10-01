import { Module } from '@nestjs/common';
import { StoreRoleRepository } from 'src/modules/store/store-role/store-role.repository';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';

@Module({
  providers: [StoreRoleRepository, StoreRoleService],
  exports: [StoreRoleService],
})
export class StoreRoleModule {}
