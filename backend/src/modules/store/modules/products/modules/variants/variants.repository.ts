import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class VariantsRepository extends BaseRepository<ProductVariant> {
  constructor(dataSource: DataSource) {
    super(ProductVariant, dataSource.createEntityManager());
  }
}
