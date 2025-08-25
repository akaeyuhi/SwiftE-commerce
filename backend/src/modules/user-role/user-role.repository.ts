import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { UserRole } from 'src/entities/user-role.entity';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {}
