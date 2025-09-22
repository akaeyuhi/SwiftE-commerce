import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(dataSource: DataSource) {
    super(UserRole, dataSource.createEntityManager());
  }
}
