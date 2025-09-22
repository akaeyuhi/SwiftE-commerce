import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class StoreRepository extends BaseRepository<Store> {
  async findStoreByName(storeName: string): Promise<Store | null> {
    return this.findOneBy({ name: storeName });
  }
}
