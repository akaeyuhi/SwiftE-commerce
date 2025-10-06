import { User } from 'src/entities/user/user.entity';

export const IUserService = Symbol('USER_ADMIN_SERVICE');
export const IUserRepository = Symbol('USER_ADMIN_REPOSITORY');

export interface IUserService {
  getEntityById(id: string): Promise<User | null>;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
}
