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
   */
  async recalculateStats(productId: string): Promise<void> {
    const product = await this.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Count reviews
    const reviewCount = await this.manager.getRepository('Review').count({
      where: { productId },
    });

    // Calculate average rating
    const ratingResult = await this.manager
      .getRepository('Review')
      .createQueryBuilder('r')
      .select('ROUND(AVG(r.rating)::NUMERIC, 2)', 'avgRating')
      .where('r.productId = :productId', { productId })
      .getRawOne();

    const averageRating = parseFloat(ratingResult?.avgRating || '0');

    // Count likes
    const likeCount = await this.manager.getRepository('Like').count({
      where: { productId },
    });

    const salesResult = await this.manager
      .getRepository('OrderItem')
      .createQueryBuilder('oi')
      .select('COALESCE(SUM(oi.quantity), 0)', 'totalSales')
      .where('oi.product.id = :productId', { productId })
      .getRawOne();

    const totalSales = parseInt(salesResult?.totalSales || '0', 10);

    await this.update(productId, {
      reviewCount,
      averageRating,
      likeCount,
      totalSales,
    });
  }
}
