import { SetMetadata } from '@nestjs/common';
import { AdminRoles } from 'src/common/enums/admin.enum';

/**
 * Admin role decorator to assign required roles to route handlers.
 * Usage: @AdminRole(AdminRoles.ADMIN)
 */
export const ADMIN_ROLE_META = 'adminRole';
export const AdminRole = (role: AdminRoles) =>
  SetMetadata(ADMIN_ROLE_META, role);
