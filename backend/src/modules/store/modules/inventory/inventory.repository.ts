import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Inventory } from 'src/entities/store/inventory.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class InventoryRepository extends BaseRepository<Inventory> {
  constructor(dataSource: DataSource) {
    super(Inventory, dataSource.createEntityManager());
  }
}
