import { SetMetadata } from '@nestjs/common';
import { AdminRoles } from 'src/common/enums/admin.enum';

export const ADMIN_ROLE_META = 'adminRole';
export const AdminRole = (role: AdminRoles) =>
  SetMetadata(ADMIN_ROLE_META, role);
