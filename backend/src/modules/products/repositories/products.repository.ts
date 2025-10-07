import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }

  /**
   * Find products belonging to a given store
   */
  async findAllByStore(storeId: string): Promise<Product[]> {
    return this.createQueryBuilder('p')
      .leftJoinAndSelect('p.store', 's')
      .leftJoinAndSelect('p.photos', 'photos')
      .where('s.id = :storeId', { storeId })
      .getMany();
  }

  /**
   * Find product with all relations
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
   * Find products by category
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

  /**
   * Manually recalculate cached statistics
   */
  async recalculateStats(productId: string): Promise<void> {
    await this.manager.query(
      `
      UPDATE products p
      SET 
        review_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id),
        average_rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews r WHERE r.product_id = p.id),
        like_count = (SELECT COUNT(*) FROM likes l WHERE l.product_id = p.id),
        total_sales = COALESCE((SELECT SUM(quantity) FROM order_items oi WHERE oi.product_id = p.id), 0)
      WHERE p.id = $1
    `,
      [productId]
    );
  }
}
