import { SetMetadata } from '@nestjs/common';
import { AdminRoles } from 'src/common/enums/admin.enum';

export const ROLES_KEY = 'adminRole';
export const AdminRole = (role: AdminRoles) => SetMetadata(ROLES_KEY, role);
