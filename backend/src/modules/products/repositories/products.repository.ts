import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.find({
      where: { storeId },
      relations: ['photos', 'categories'],
    });
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
   * REFACTORED: This method now uses a single query with subqueries to avoid N+1 issues.
   */
  async recalculateStats(productId: string): Promise<void> {
    const stats = await this.manager
      .createQueryBuilder(Product, 'p')
      .select('p.id')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(r.id)')
            .from('Review', 'r')
            .where('r.productId = :productId', { productId }),
        'reviewCount'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('ROUND(AVG(r.rating)::NUMERIC, 2)')
            .from('Review', 'r')
            .where('r.productId = :productId', { productId }),
        'averageRating'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(l.id)')
            .from('Like', 'l')
            .where('l.productId = :productId', { productId }),
        'likeCount'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COALESCE(SUM(oi.quantity), 0)')
            .from('OrderItem', 'oi')
            .where('oi.product.id = :productId', { productId }),
        'totalSales'
      )
      .where('p.id = :productId', { productId })
      .getRawOne();

    if (!stats) {
      throw new NotFoundException('Product not found');
    }

    await this.update(productId, {
      reviewCount: stats.reviewCount,
      averageRating: parseFloat(stats.averageRating || '0'),
      likeCount: stats.likeCount,
      totalSales: parseInt(stats.totalSales || '0', 10),
    });
  }
}
