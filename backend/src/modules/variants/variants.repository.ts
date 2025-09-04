import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductVariant } from 'src/entities/variant.entity';

@Injectable()
export class VariantsRepository extends Repository<ProductVariant> {
  constructor(dataSource: DataSource) {
    super(ProductVariant, dataSource.createEntityManager());
  }
}
