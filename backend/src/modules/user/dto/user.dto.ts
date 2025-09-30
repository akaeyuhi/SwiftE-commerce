import { BaseEntity } from 'src/common/interfaces/crud/base-entity.interface';

export class UserDto implements BaseEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}
