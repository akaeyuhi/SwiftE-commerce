import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Store } from 'src/entities/store/store.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class StoreRepository extends BaseRepository<Store> {
  constructor(dataSource: DataSource) {
    super(Store, dataSource.createEntityManager());
  }

  async findStoreByName(storeName: string): Promise<Store | null> {
    return this.findOneBy({ name: storeName });
  }
}
