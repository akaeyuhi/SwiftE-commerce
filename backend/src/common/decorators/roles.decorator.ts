import { SetMetadata } from '@nestjs/common';

/**
 * Roles decorator to assign required roles to route handlers.
 * Usage: @Roles('admin', 'store-admin')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
