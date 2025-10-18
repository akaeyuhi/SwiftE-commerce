import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreRoleDto } from 'src/modules/store/store-role/dto/create-store-role.dto';
import { Store } from 'src/entities/store/store.entity';

export class UpdateStoreRoleDto extends PartialType(CreateStoreRoleDto) {
  store?: Store;
  revokedBy?: string;
  revokedAt?: Date;
}
