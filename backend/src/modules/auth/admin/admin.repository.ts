import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Admin } from 'src/entities/user/policy/admin.entity';

@Injectable()
export class AdminRepository extends BaseRepository<Admin> {
  constructor(dataSource: DataSource) {
    super(Admin, dataSource.createEntityManager());
  }
}
