import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { ProductListDto } from 'src/modules/products/dto/product.dto';

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
   * Find products with stats for efficient listing
   */
  async findAllByStoreWithStats(storeId: string): Promise<ProductListDto[]> {
    const products = await this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos')
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('photos.isMain = :isMain', { isMain: true })
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .getRawMany();

    return products.map((p) => ({
      id: p.p_id,
      name: p.p_name,
      description: p.p_description,
      averageRating: Number(p.p_averageRating) || 0,
      reviewCount: p.p_reviewCount || 0,
      likeCount: p.p_likeCount || 0,
      viewCount: p.p_viewCount || 0,
      totalSales: p.p_totalSales || 0,
      mainPhotoUrl: p.mainPhotoUrl,
      minPrice: p.minPrice ? Number(p.minPrice) : undefined,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : undefined,
    }));
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

  /**
   * Find trending products
   */
  async findTrendingProducts(
    limit: number,
    sortBy: 'views' | 'likes' | 'sales'
  ): Promise<ProductListDto[]> {
    const orderColumn =
      sortBy === 'views'
        ? 'p.viewCount'
        : sortBy === 'likes'
          ? 'p.likeCount'
          : 'p.totalSales';

    const products = await this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = :isMain', {
        isMain: true,
      })
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'photos.url',
      ])
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.deletedAt IS NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy(orderColumn, 'DESC')
      .limit(limit)
      .getRawMany();

    return this.mapToListDto(products);
  }

  /**
   * Find top rated products
   */
  async findTopRatedProducts(limit: number): Promise<ProductListDto[]> {
    const products = await this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = :isMain', {
        isMain: true,
      })
      .leftJoin('p.variants', 'variants')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'photos.url',
      ])
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.deletedAt IS NULL')
      .andWhere('p.reviewCount >= :minReviews', { minReviews: 5 })
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.averageRating', 'DESC')
      .addOrderBy('p.reviewCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return this.mapToListDto(products);
  }

  /**
   * Manually recalculate cached statistics for a product
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

  private mapToListDto(rawProducts: any[]): ProductListDto[] {
    return rawProducts.map((p) => ({
      id: p.p_id,
      name: p.p_name,
      description: p.p_description,
      averageRating: Number(p.p_averageRating) || 0,
      reviewCount: p.p_reviewCount || 0,
      likeCount: p.p_likeCount || 0,
      viewCount: p.p_viewCount || 0,
      totalSales: p.p_totalSales || 0,
      mainPhotoUrl: p.photos_url,
      minPrice: p.minPrice ? Number(p.minPrice) : undefined,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : undefined,
    }));
  }
}
