import { Inject, Injectable } from '@nestjs/common';
import {
  IStoreRepository,
  IStoreService,
} from 'src/common/contracts/products.contract';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class ProductStoreService implements IStoreService {
  constructor(
    @Inject(IStoreRepository)
    private readonly storeRepository: IStoreRepository
  ) {}

  getEntityById(storeId: string): Promise<Store | null> {
    return this.storeRepository.findById(storeId);
  }
}
