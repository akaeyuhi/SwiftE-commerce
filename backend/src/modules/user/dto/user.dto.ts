import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';
import { AdminRoles } from 'src/common/enums/admin.enum';

export class UserDto implements BaseEntity {
  id: string;
  email: string;
  firstName: string;
  isEmailVerified: boolean;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  siteRole: AdminRoles;
  emailVerifiedAt?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
}
