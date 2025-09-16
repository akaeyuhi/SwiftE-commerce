import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/product.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }

  /**
   * Find products belonging to a given store.
   *
   * @param storeId - store uuid
   */
  async findAllByStore(storeId: string): Promise<Product[]> {
    return this.createQueryBuilder('p')
      .leftJoinAndSelect('p.store', 's')
      .leftJoinAndSelect('p.photos', 'photos')
      .where('s.id = :storeId', { storeId })
      .getMany();
  }

  /**
   * Find product with relations (photos, variants, categories, reviews).
   *
   * @param id - product id
   */
  async findWithRelations(id: string): Promise<Product | null> {
    return this.createQueryBuilder('p')
      .leftJoinAndSelect('p.photos', 'photos')
      .leftJoinAndSelect('p.variants', 'variants')
      .leftJoinAndSelect('p.categories', 'categories')
      .leftJoinAndSelect('p.reviews', 'reviews')
      .where('p.id = :id', { id })
      .getOne();
  }

  /**
   * Find products that belong to the given category (ManyToMany).
   * Optionally filter to a specific store.
   *
   * @param categoryId - category uuid
   * @param storeId - optional store uuid
   */
  async findProductsByCategory(
    categoryId: string,
    storeId?: string
  ): Promise<Product[]> {
    const qb = this.createQueryBuilder('p')
      .leftJoin('p.categories', 'c')
      .leftJoinAndSelect('p.store', 's')
      .leftJoinAndSelect('p.photos', 'photos')
      .where('c.id = :categoryId', { categoryId });

    if (storeId) {
      qb.andWhere('s.id = :storeId', { storeId });
    }

    return qb.getMany();
  }
}
