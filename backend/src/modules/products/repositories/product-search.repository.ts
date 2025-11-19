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

  async countProducts(
    query: string,
    searchTerms: string[],
    storeId?: string,
    options?: ProductSearchOptions
  ): Promise<number> {
    const qb = this.createQueryBuilder('p')
      .select('COUNT(DISTINCT p.id)', 'count')
      .where('p.deletedAt IS NULL');

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    // Apply same filters as search
    if (searchTerms.length === 1 && query) {
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: `%${query.toLowerCase()}%` }
      );
    } else if (searchTerms.length > 1) {
      searchTerms.forEach((term, index) => {
        qb.andWhere(
          `(LOWER(p.name) LIKE :term${index} OR LOWER(p.description) LIKE :term${index})`,
          { [`term${index}`]: `%${term.toLowerCase()}%` }
        );
      });
    }

    if (options?.categoryId) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id = :categoryId',
        { categoryId: options.categoryId }
      );
    }

    if (options?.minRating) {
      qb.andWhere('p.averageRating >= :minRating', {
        minRating: options.minRating,
      });
    }

    // Price filters require joins
    if (options?.minPrice || options?.maxPrice) {
      qb.leftJoin('p.variants', 'variants');

      if (options.minPrice) {
        qb.andWhere('variants.price >= :minPrice', {
          minPrice: options.minPrice,
        });
      }
      if (options.maxPrice) {
        qb.andWhere('variants.price <= :maxPrice', {
          maxPrice: options.maxPrice,
        });
      }
    }

    const result = await qb.getRawOne();
    return parseInt(result.count, 10) || 0;
  }

  async searchProducts(
    query: string,
    limit = 20,
    searchTerms: string[],
    storeId?: string,
    options?: ProductSearchOptions
  ): Promise<ProductListDto[]> {
    const qb = this.createQueryBuilder('p')
      .select([
        'p.id',
        'p.storeId',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'p.createdAt',
        'variants.id',
        'variants.price',
        'variants.sku',
        'inventory.quantity',
        'p.updatedAt',
      ])
      .leftJoin('p.photos', 'photos', 'photos.isMain = true')
      .leftJoin('p.variants', 'variants')
      .leftJoin('variants.inventory', 'inventory')
      .leftJoinAndSelect('p.categories', 'categories')
      .leftJoinAndSelect('p.store', 'store')
      .addSelect('MAX(photos.url)', 'mainPhotoUrl')
      .addSelect('MIN(variants.price)', 'minPrice')
      .addSelect('MAX(variants.price)', 'maxPrice')
      .where('p.deletedAt IS NULL');

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    // Multi-term search
    if (searchTerms.length === 1) {
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: `%${query.toLowerCase()}%` }
      );
    } else {
      searchTerms.forEach((term, index) => {
        qb.andWhere(
          `(LOWER(p.name) LIKE :term${index} OR LOWER(p.description) LIKE :term${index})`,
          { [`term${index}`]: `%${term.toLowerCase()}%` }
        );
      });
    }

    // Apply filters
    if (options?.categoryId) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id = :categoryId',
        { categoryId: options.categoryId }
      );
    }

    if (options?.minRating) {
      qb.andWhere('p.averageRating >= :minRating', {
        minRating: options.minRating,
      });
    }

    const havingConditions: string[] = [];
    if (options?.minPrice) {
      havingConditions.push('MIN(variants.price) >= :minPrice');
      qb.setParameter('minPrice', options.minPrice);
    }
    if (options?.maxPrice) {
      havingConditions.push('MAX(variants.price) <= :maxPrice');
      qb.setParameter('maxPrice', options.maxPrice);
    }

    const relevanceScore = `
    CASE
      WHEN LOWER(p.name) = :exactQuery THEN 1000
      WHEN LOWER(p.name) LIKE :startsWithQuery THEN 500
      WHEN LOWER(p.name) LIKE :query THEN 100
      WHEN LOWER(p.description) LIKE :query THEN 50
      ELSE 10
    END + (p.viewCount * 0.1) + (p.likeCount * 0.5) + (p.totalSales * 2)
  `;

    qb.addSelect(`(${relevanceScore})`, 'relevanceScore')
      .setParameter('exactQuery', query.toLowerCase())
      .setParameter('startsWithQuery', `${query.toLowerCase()}%`)
      .setParameter('query', `%${query.toLowerCase()}%`);

    qb.groupBy('p.id')
      .addGroupBy('variants.id')
      .addGroupBy('inventory.id')
      .addGroupBy('inventory.quantity')
      .addGroupBy('categories.id')
      .addGroupBy('store.id');

    if (havingConditions.length > 0) {
      qb.having(havingConditions.join(' AND '));
    }

    this.applySorting(qb, options?.sortBy || 'relevance');

    if (limit || options?.limit) {
      const offset = options?.offset || 0;
      qb.skip(offset).take(limit);
    }

    const { entities, raw } = await qb.getRawAndEntities();

    const productIds = entities.map((e) => e.id);

    if (productIds.length === 0) {
      return [];
    }

    const productsWithVariants = await this.createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'variants')
      .leftJoinAndSelect('variants.inventory', 'inventory')
      .whereInIds(productIds)
      .getMany();

    const productsMap = new Map(productsWithVariants.map((p) => [p.id, p]));

    return entities.map((entity, index) => {
      const productWithRelations = productsMap.get(entity.id);

      return {
        ...entity,
        variants: productWithRelations?.variants || [],
        photos: productWithRelations?.photos || [],
        store: productWithRelations?.store,
        mainPhotoUrl: raw[index].mainPhotoUrl || null,
        minPrice: parseFloat(raw[index].minPrice) || 0,
        maxPrice: parseFloat(raw[index].maxPrice) || 0,
        relevanceScore: parseFloat(raw[index].relevanceScore) || 0,
      };
    }) as ProductListDto[];

    // return entities.map((entity, index) => ({
    //   ...entity,
    //   variants: raw[index].variants || [],
    //   mainPhotoUrl: raw[index].mainPhotoUrl || null,
    //   minPrice: parseFloat(raw[index].minPrice) || 0,
    //   maxPrice: parseFloat(raw[index].maxPrice) || 0,
    //   relevanceScore: parseFloat(raw[index].relevanceScore) || 0,
    // })) as ProductListDto[];
  }

  async advancedSearch(
    filters: AdvancedSearchOptions
  ): Promise<[ProductListDto[], number]> {
    const qb = this.createQueryBuilder('p')
      .select([
        'p.id',
        'p.storeId',
        'p.name',
        'p.description',
        'p.averageRating',
        'p.reviewCount',
        'p.likeCount',
        'p.viewCount',
        'p.totalSales',
        'p.mainPhotoUrl',
        'p.createdAt',
      ])
      .where('p.deletedAt IS NULL');

    if (filters.storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId: filters.storeId });
    }

    // Text search
    if (filters.query) {
      const normalizedQuery = filters.query.trim().toLowerCase();
      qb.andWhere(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: `%${normalizedQuery}%` }
      );
    }

    // Category filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      qb.leftJoin('p.categories', 'category').andWhere(
        'category.id IN (:...categoryIds)',
        { categoryIds: filters.categoryIds }
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

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      qb.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('v.productId')
          .from('product_variants', 'v')
          .where('1=1');

        if (filters.minPrice !== undefined) {
          subQuery.andWhere('v.price >= :minPrice', {
            minPrice: filters.minPrice,
          });
        }
        if (filters.maxPrice !== undefined) {
          subQuery.andWhere('v.price <= :maxPrice', {
            maxPrice: filters.maxPrice,
          });
        }

        return `p.id IN ${subQuery.getQuery()}`;
      });
    }

    // In stock filter using subquery
    if (filters.inStock) {
      qb.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('DISTINCT v2.productId')
          .from('product_variants', 'v2')
          .leftJoin('v2.inventory', 'inv', 'inv.variantId = v2.id')
          .where('inv.quantity > 0')
          .getQuery();

        return `p.id IN ${subQuery}`;
      });
    }

    // Get count
    const total = await qb.getCount();

    // Sorting
    const sortBy = filters.sortBy || 'recent';
    const sortOrder = filters.sortOrder || 'DESC';

    switch (sortBy) {
      case 'rating':
        qb.orderBy('p.averageRating', sortOrder);
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

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const products = await qb.getMany();

    if (products.length === 0) {
      return [[], 0];
    }

    const productIds = products.map((p) => p.id);
    const productsWithRelations = await this.createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'variants')
      .leftJoinAndSelect('variants.inventory', 'inventory')
      .leftJoinAndSelect('p.store', 'store')
      .leftJoinAndSelect('p.categories', 'categories')
      .where('p.id IN (:...productIds)', { productIds })
      .getMany();

    const relationsMap = new Map(
      productsWithRelations.map((p) => [
        p.id,
        {
          variants: p.variants || [],
          store: p.store,
          categories: p.categories || [],
        },
      ])
    );

    const productsWithData = products.map((product) => {
      const relations = relationsMap.get(product.id);
      const variants = relations?.variants || [];
      const prices = variants.map((v) => v.price).filter((p) => p !== null);
      const stocks = variants.map((v) => v.inventory?.quantity || 0);

      return {
        ...product,
        variants,
        store: relations?.store, // ✅ Add store
        categories: relations?.categories || [], // ✅ Add categories
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        totalStock: stocks.reduce((sum, qty) => sum + qty, 0),
        inStock: stocks.some((qty) => qty > 0),
      };
    });

    // Sort by price if needed
    if (sortBy === 'price') {
      productsWithData.sort((a, b) => {
        const diff = a.minPrice - b.minPrice;
        return sortOrder === 'ASC' ? diff : -diff;
      });
    }

    return [productsWithData, total];
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
        qb.orderBy('p.viewCount', 'DESC');
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
}
