import { User } from 'src/entities/user/user.entity';

export const USER_SERVICE = 'USER_ADMIN_SERVICE';
export const USER_REPOSITORY = 'USER_ADMIN_REPOSITORY';

export interface IUserService {
  getEntityById(id: string): Promise<User | null>;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
}
