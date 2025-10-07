import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductListDto } from '../dto/product.dto';
import { ProductSearchOptions, AdvancedSearchOptions } from '../types';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductSearchRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }

  async searchProducts(
    storeId: string,
    query: string,
    limit = 20,
    searchTerms: string[],
    options?: ProductSearchOptions
  ): Promise<ProductListDto[]> {
    const qb = this.createQueryBuilder('p')
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
      .andWhere('p.deletedAt IS NULL');

    // Multi-term search
    if (searchTerms.length === 1) {
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        {
          query: `%${query}%`,
        }
      );
    } else {
      searchTerms.forEach((term, index) => {
        qb.andWhere(
          `(LOWER(p.name) LIKE :term${index} OR LOWER(p.description) LIKE :term${index})`,
          { [`term${index}`]: `%${term}%` }
        );
      });
    }

    // Apply filters
    if (options?.categoryId) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id = :categoryId',
        {
          categoryId: options.categoryId,
        }
      );
    }

    if (options?.minRating) {
      qb.andWhere('p.averageRating >= :minRating', {
        minRating: options.minRating,
      });
    }

    // Price filtering
    const havingConditions: string[] = [];
    if (options?.minPrice) {
      havingConditions.push('MIN(variants.price) >= :minPrice');
      qb.setParameter('minPrice', options.minPrice);
    }
    if (options?.maxPrice) {
      havingConditions.push('MAX(variants.price) <= :maxPrice');
      qb.setParameter('maxPrice', options.maxPrice);
    }

    // Relevance score
    let relevanceScore = `
      CASE
        WHEN LOWER(p.name) = :exactQuery THEN 1000
        WHEN LOWER(p.name) LIKE :startsWithQuery THEN 500
        WHEN LOWER(p.name) LIKE :query THEN 100
        WHEN LOWER(p.description) LIKE :query THEN 50
        ELSE 10
      END
    `;
    relevanceScore += ` + (p.viewCount * 0.1) + (p.likeCount * 0.5) + (p.totalSales * 2)`;

    qb.addSelect(`(${relevanceScore})`, 'relevanceScore')
      .setParameter('exactQuery', query)
      .setParameter('startsWithQuery', `${query}%`)
      .setParameter('query', `%${query}%`);

    qb.groupBy('p.id').addGroupBy('photos.url');

    if (havingConditions.length > 0) {
      qb.having(havingConditions.join(' AND '));
    }

    // Sorting
    this.applySorting(qb, options?.sortBy || 'relevance');
    qb.limit(limit);

    return this.mapToListDto(await qb.getRawMany());
  }

  async advancedSearch(
    filters: AdvancedSearchOptions
  ): Promise<{ products: ProductListDto[]; total: number }> {
    const qb = this.createQueryBuilder('p')
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
        'p.createdAt',
      ])
      .addSelect('photos.url', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.storeId = :storeId', { storeId: filters.storeId })
      .andWhere('p.deletedAt IS NULL');

    // Text search
    if (filters.query) {
      const normalizedQuery = filters.query.trim().toLowerCase();
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        {
          query: `%${normalizedQuery}%`,
        }
      );
    }

    // Category filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id IN (:...categoryIds)',
        {
          categoryIds: filters.categoryIds,
        }
      );
    }

    // Rating filters
    if (filters.minRating !== undefined) {
      qb.andWhere('p.averageRating >= :minRating', {
        minRating: filters.minRating,
      });
    }
    if (filters.maxRating !== undefined) {
      qb.andWhere('p.averageRating <= :maxRating', {
        maxRating: filters.maxRating,
      });
    }

    // In stock filter
    if (filters.inStock) {
      qb.leftJoin('variants.inventory', 'inventory').andWhere(
        'inventory.quantity > 0'
      );
    }

    qb.groupBy('p.id').addGroupBy('photos.url');

    // Price filters
    const havingConditions: string[] = [];
    if (filters.minPrice !== undefined) {
      havingConditions.push('MIN(variants.price) >= :minPrice');
      qb.setParameter('minPrice', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      havingConditions.push('MAX(variants.price) <= :maxPrice');
      qb.setParameter('maxPrice', filters.maxPrice);
    }
    if (havingConditions.length > 0) {
      qb.having(havingConditions.join(' AND '));
    }

    // Count total
    const countQb = qb.clone();
    const total = await countQb.getCount();

    // Sorting
    const sortBy = filters.sortBy || 'recent';
    const sortOrder = filters.sortOrder || 'DESC';
    this.applySortingWithOrder(qb, sortBy, sortOrder);

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const results = await qb.getRawMany();
    return { products: this.mapToListDto(results), total };
  }

  async autocompleteProducts(
    storeId: string,
    query: string,
    limit = 10
  ): Promise<
    Array<{
      id: string;
      name: string;
      mainPhotoUrl?: string;
      minPrice?: number;
    }>
  > {
    return await this.createQueryBuilder('p')
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .select(['p.id', 'p.name'])
      .addSelect('photos.url', 'photoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('LOWER(p.name) LIKE :query', { query: `${query}%` })
      .groupBy('p.id')
      .addGroupBy('photos.url')
      .orderBy('p.viewCount', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private applySorting(qb: any, sortBy: string) {
    switch (sortBy) {
      case 'views':
        qb.orderBy('p.viewCount', 'DESC');
        break;
      case 'sales':
        qb.orderBy('p.totalSales', 'DESC');
        break;
      case 'rating':
        qb.orderBy('p.averageRating', 'DESC').addOrderBy(
          'p.reviewCount',
          'DESC'
        );
        break;
      case 'price':
        qb.orderBy('MIN(variants.price)', 'ASC');
        break;
      case 'recent':
        qb.orderBy('p.createdAt', 'DESC');
        break;
      case 'relevance':
      default:
        qb.orderBy('relevanceScore', 'DESC').addOrderBy('p.viewCount', 'DESC');
        break;
    }
  }

  private applySortingWithOrder(
    qb: any,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC'
  ) {
    switch (sortBy) {
      case 'name':
        qb.orderBy('p.name', sortOrder);
        break;
      case 'price':
        qb.orderBy('MIN(variants.price)', sortOrder);
        break;
      case 'rating':
        qb.orderBy('p.averageRating', sortOrder).addOrderBy(
          'p.reviewCount',
          sortOrder
        );
        break;
      case 'views':
        qb.orderBy('p.viewCount', sortOrder);
        break;
      case 'sales':
        qb.orderBy('p.totalSales', sortOrder);
        break;
      case 'recent':
      default:
        qb.orderBy('p.createdAt', sortOrder);
        break;
    }
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
      mainPhotoUrl: p.mainPhotoUrl,
      minPrice: p.minPrice ? Number(p.minPrice) : undefined,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : undefined,
    }));
  }
}
