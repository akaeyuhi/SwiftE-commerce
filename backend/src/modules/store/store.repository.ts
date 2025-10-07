import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import {
  StoreSearchByNameOptions,
  StoreSearchOptions,
} from 'src/modules/store/types';

@Injectable()
export class StoreRepository extends BaseRepository<Store> {
  constructor(dataSource: DataSource) {
    super(Store, dataSource.createEntityManager());
  }

  async findStoreByName(name: string): Promise<Store | null> {
    return this.findOne({ where: { name } });
  }

  /**
   * Find top stores by total revenue
   */
  async findTopByRevenue(limit: number): Promise<Store[]> {
    return this.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
      ],
      order: { totalRevenue: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find top stores by product count
   */
  async findTopByProductCount(limit: number): Promise<Store[]> {
    return this.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
      ],
      order: { productCount: 'DESC' },
      take: limit,
    });
  }

  /**
   * Manually recalculate all cached statistics for a store
   * Use this for data integrity checks or migrations
   */
  async recalculateStats(storeId: string): Promise<void> {
    await this.manager.query(
      `
      UPDATE stores s
      SET 
        product_count = (
          SELECT COUNT(*) 
          FROM products p 
          WHERE p.store_id = s.id AND p.deleted_at IS NULL
        ),
        follower_count = (
          SELECT COUNT(*) 
          FROM store_followers sf 
          WHERE sf.store_id = s.id
        ),
        order_count = (
          SELECT COUNT(*) 
          FROM orders o 
          WHERE o.store_id = s.id
        ),
        total_revenue = COALESCE((
          SELECT SUM(total_amount) 
          FROM orders o 
          WHERE o.store_id = s.id AND o.status = 'completed'
        ), 0)
      WHERE s.id = $1
    `,
      [storeId]
    );
  }

  /**
   * Recalculate stats for all stores (admin operation)
   */
  async recalculateAllStats(): Promise<void> {
    await this.manager.query(`
      UPDATE stores s
      SET 
        product_count = (
          SELECT COUNT(*) 
          FROM products p 
          WHERE p.store_id = s.id AND p.deleted_at IS NULL
        ),
        follower_count = (
          SELECT COUNT(*) 
          FROM store_followers sf 
          WHERE sf.store_id = s.id
        ),
        order_count = (
          SELECT COUNT(*) 
          FROM orders o 
          WHERE o.store_id = s.id
        ),
        total_revenue = COALESCE((
          SELECT SUM(total_amount) 
          FROM orders o 
          WHERE o.store_id = s.id AND o.status = 'completed'
        ), 0)
    `);
  }

  async searchStoreByName(
    query: string,
    limit = 20,
    searchTerms: string[],
    options?: StoreSearchByNameOptions
  ): Promise<Store[]> {
    const qb = this.createQueryBuilder('store').select([
      'store.id',
      'store.name',
      'store.description',
      'store.productCount',
      'store.followerCount',
      'store.totalRevenue',
      'store.orderCount',
      'store.createdAt',
      'store.updatedAt',
    ]);

    // Apply filters
    if (options?.minFollowers) {
      qb.andWhere('store.followerCount >= :minFollowers', {
        minFollowers: options.minFollowers,
      });
    }

    if (options?.minProducts) {
      qb.andWhere('store.productCount >= :minProducts', {
        minProducts: options.minProducts,
      });
    }

    // Multi-term search with relevance scoring
    if (searchTerms.length === 1) {
      // Single term - simple ILIKE
      qb.andWhere(
        '(LOWER(store.name) LIKE :query OR LOWER(store.description) LIKE :query)',
        { query: `%${query}%` }
      );
    } else {
      // Multiple terms - match all terms
      searchTerms.forEach((term, index) => {
        qb.andWhere(
          `(LOWER(store.name) LIKE :term${index} OR LOWER(store.description) LIKE :term${index})`,
          { [`term${index}`]: `%${term}%` }
        );
      });
    }

    // Calculate relevance score
    let relevanceScore = `
      CASE
        WHEN LOWER(store.name) = :exactQuery THEN 1000
        WHEN LOWER(store.name) LIKE :startsWithQuery THEN 500
        WHEN LOWER(store.name) LIKE :query THEN 100
        WHEN LOWER(store.description) LIKE :query THEN 50
        ELSE 10
      END
    `;

    // Add popularity boost to relevance
    relevanceScore += ` + (store.followerCount * 0.1) + (store.productCount * 0.05)`;

    qb.addSelect(`(${relevanceScore})`, 'relevanceScore')
      .setParameter('exactQuery', query)
      .setParameter('startsWithQuery', `${query}%`)
      .setParameter('query', `%${query}%`);

    // Apply sorting
    const sortBy = options?.sortBy || 'relevance';
    switch (sortBy) {
      case 'followers':
        qb.orderBy('store.followerCount', 'DESC');
        break;
      case 'revenue':
        qb.orderBy('store.totalRevenue', 'DESC');
        break;
      case 'products':
        qb.orderBy('store.productCount', 'DESC');
        break;
      case 'recent':
        qb.orderBy('store.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('relevanceScore', 'DESC').addOrderBy(
          'store.followerCount',
          'DESC'
        );
        break;
    }

    qb.limit(limit);

    return await qb.getRawMany();
  }

  async advancedStoreSearch(filters: StoreSearchOptions) {
    const qb = this.createQueryBuilder('store').select([
      'store.id',
      'store.name',
      'store.description',
      'store.productCount',
      'store.followerCount',
      'store.totalRevenue',
      'store.orderCount',
      'store.createdAt',
      'store.updatedAt',
    ]);

    // Text search
    if (filters.query) {
      const normalizedQuery = filters.query.trim().toLowerCase();
      qb.andWhere(
        '(LOWER(store.name) LIKE :query OR LOWER(store.description) LIKE :query)',
        { query: `%${normalizedQuery}%` }
      );
    }

    // Revenue filters
    if (filters.minRevenue !== undefined) {
      qb.andWhere('store.totalRevenue >= :minRevenue', {
        minRevenue: filters.minRevenue,
      });
    }
    if (filters.maxRevenue !== undefined) {
      qb.andWhere('store.totalRevenue <= :maxRevenue', {
        maxRevenue: filters.maxRevenue,
      });
    }

    // Product count filters
    if (filters.minProducts !== undefined) {
      qb.andWhere('store.productCount >= :minProducts', {
        minProducts: filters.minProducts,
      });
    }
    if (filters.maxProducts !== undefined) {
      qb.andWhere('store.productCount <= :maxProducts', {
        maxProducts: filters.maxProducts,
      });
    }

    // Follower filters
    if (filters.minFollowers !== undefined) {
      qb.andWhere('store.followerCount >= :minFollowers', {
        minFollowers: filters.minFollowers,
      });
    }
    if (filters.maxFollowers !== undefined) {
      qb.andWhere('store.followerCount <= :maxFollowers', {
        maxFollowers: filters.maxFollowers,
      });
    }

    // Sorting
    const sortBy = filters.sortBy || 'recent';
    const sortOrder = filters.sortOrder || 'DESC';

    switch (sortBy) {
      case 'name':
        qb.orderBy('store.name', sortOrder);
        break;
      case 'revenue':
        qb.orderBy('store.totalRevenue', sortOrder);
        break;
      case 'followers':
        qb.orderBy('store.followerCount', sortOrder);
        break;
      case 'products':
        qb.orderBy('store.productCount', sortOrder);
        break;
      case 'recent':
      default:
        qb.orderBy('store.createdAt', sortOrder);
        break;
    }

    // Count total before pagination
    const total = await qb.getCount();

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const stores = await qb.getMany();
    return { stores, total };
  }

  async findTopStoresByFollowers(limit = 10) {
    return this.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
      ],
      order: { followerCount: 'DESC' },
      take: limit,
    });
  }

  async findStoreStats(storeId: string) {
    return this.findOne({
      where: { id: storeId },
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
      ],
    });
  }

  async findAllWithStats() {
    return this.find({
      select: [
        'id',
        'name',
        'description',
        'productCount',
        'followerCount',
        'totalRevenue',
        'orderCount',
        'createdAt',
        'updatedAt',
      ],
    });
  }
}
