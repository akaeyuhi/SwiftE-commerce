import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductListDto } from '../dto/product.dto';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductQueryRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
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

    return this.mapToListDto(products);
  }

  /**
   * Get product detail with stats
   */
  async findProductDetail(productId: string): Promise<any> {
    return this.createQueryBuilder('p')
      .leftJoinAndSelect('p.photos', 'photos')
      .leftJoinAndSelect('p.variants', 'variants')
      .leftJoinAndSelect('p.categories', 'categories')
      .leftJoinAndSelect('p.reviews', 'reviews')
      .leftJoinAndSelect('reviews.user', 'user')
      .select([
        'p',
        'photos',
        'variants',
        'categories',
        'reviews',
        'user.id',
        'user.firstName',
        'user.lastName',
      ])
      .where('p.id = :productId', { productId })
      .getOne();
  }

  protected mapToListDto(rawProducts: any[]): ProductListDto[] {
    return rawProducts.map((p) => ({
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
}
