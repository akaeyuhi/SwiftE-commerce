import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  assignPermissions(user: User, ...permissions: string[]): Promise<User> {
    return this.save({ ...user, ...permissions });
  }
}
