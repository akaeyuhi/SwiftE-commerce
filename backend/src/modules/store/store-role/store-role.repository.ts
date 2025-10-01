import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class StoreRoleRepository extends BaseRepository<StoreRole> {
  constructor(dataSource: DataSource) {
    super(StoreRole, dataSource.createEntityManager());
  }
}
