import { Permission } from 'src/common/interfaces/permission.interface';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
