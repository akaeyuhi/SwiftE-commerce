import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IStoreRepository } from 'src/common/contracts/products.contract';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class ProductStoreRepository implements IStoreRepository {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>
  ) {}

  findById(storeId: string): Promise<Store | null> {
    return this.storeRepository.findOneBy({ id: storeId } as any);
  }
}
