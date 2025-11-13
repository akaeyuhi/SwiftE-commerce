import { User } from 'src/entities/user/user.entity';

export const IUserService = Symbol('USER_ADMIN_SERVICE');
export const IUserRepository = Symbol('USER_ADMIN_REPOSITORY');
export const IOrderService = Symbol('ORDER_ADMIN_SERVICE');
export const IStoreService = Symbol('STORE_ADMIN_SERVICE');

export interface IUserService {
  getEntityById(id: string): Promise<User | null>;
  count(searchParams?: any): Promise<number>;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  count(searchParams?: any): Promise<number>;
}

export interface IOrderService {
  count(searchParams?: any): Promise<number>;
  getTotalRevenue(): Promise<number>;
}

export interface IStoreService {
  count(searchParams?: any): Promise<number>;
}
