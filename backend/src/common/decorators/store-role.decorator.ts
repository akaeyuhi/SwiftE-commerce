import { SetMetadata } from '@nestjs/common';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * Store roles decorator to assign required roles to route handlers.
 * Usage: @StoreRole(StoreRoles.MODERATOR)
 */
export const STORE_ROLES_META = 'storeRoles';
export const StoreRole = (...roles: StoreRoles[]) =>
  SetMetadata(STORE_ROLES_META, roles);
