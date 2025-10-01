import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRoleDto } from './create-role.dto';
import { Store } from 'src/entities/store/store.entity';

export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {
  store?: Store;
  revokedBy?: string;
  revokedAt?: Date;
}
