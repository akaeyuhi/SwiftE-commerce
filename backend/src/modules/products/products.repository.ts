import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/product.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }

  async findWithRelations(id: string): Promise<Product | null> {
    return this.findOne({
      where: { id },
      relations: ['variants', 'photos', 'category', 'store'],
    });
  }

  async findAllByStore(storeId: string, page = 1, limit = 50) {
    return this.find({
      where: { store: { id: storeId } },
      take: limit,
      skip: (page - 1) * limit,
    });
  }
}
