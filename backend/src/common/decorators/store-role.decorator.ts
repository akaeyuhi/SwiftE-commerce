import { SetMetadata } from '@nestjs/common';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * Roles decorator to assign required roles to route handlers.
 * Usage: @Roles('admin', 'store-admin')
 */
export const ROLES_KEY = 'roles';
export const StoreRole = (...roles: StoreRoles[]) =>
  SetMetadata(ROLES_KEY, roles);
