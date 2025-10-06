import { Store } from 'src/entities/store/store.entity';

export const IStoreRepository = Symbol('MINIMAL_STORE_REPOSITORY');
export const IStoreService = Symbol('MINIMAL_STORE_SERVICE');

export interface IStoreRepository {
  findById(storeId: string): Promise<Store | null>;
}

export interface IStoreService {
  getEntityById(storeId: string): Promise<Store | null>;
}
