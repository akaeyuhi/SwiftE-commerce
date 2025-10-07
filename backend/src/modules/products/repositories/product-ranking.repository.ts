import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductRankingRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }
  async findTopProductsByViews(storeId: string, limit = 10): Promise<any[]> {
    return this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
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
      .andWhere('p.viewCount > 0')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.viewCount', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async findTopProductsBySales(storeId: string, limit = 10): Promise<any[]> {
    return this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
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
      .andWhere('p.totalSales > 0')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.totalSales', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async findTopRatedProducts(
    storeId: string,
    limit = 10,
    minReviews = 5
  ): Promise<any[]> {
    return this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
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
      .andWhere('p.reviewCount >= :minReviews', { minReviews })
      .andWhere('p.averageRating IS NOT NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.averageRating', 'DESC')
      .addOrderBy('p.reviewCount', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async findTopProductsByConversion(
    storeId: string,
    limit = 10,
    minViews = 50
  ): Promise<any[]> {
    return this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
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
      .addSelect(
        '(CAST(p.totalSales AS FLOAT) / NULLIF(p.viewCount, 0))',
        'conversionRate'
      )
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.viewCount >= :minViews', { minViews })
      .andWhere('p.totalSales > 0')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('conversionRate', 'DESC')
      .addOrderBy('p.totalSales', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async findTrendingProducts(
    storeId: string,
    dateThreshold: string
  ): Promise<any[]> {
    return this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .leftJoinAndSelect(
        'analytics_events',
        'events',
        'events.product_id = p.id AND events.created_at >= :dateThreshold',
        { dateThreshold }
      )
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'p.createdAt',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .addSelect(
        `COUNT(CASE WHEN events.event_type = 'view' THEN 1 END)`,
        'recentViews'
      )
      .addSelect(
        `COUNT(CASE WHEN events.event_type = 'like' THEN 1 END)`,
        'recentLikes'
      )
      .addSelect(
        `COUNT(CASE WHEN events.event_type = 'purchase' THEN 1 END)`,
        'recentSales'
      )
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .getRawMany();
  }
}
