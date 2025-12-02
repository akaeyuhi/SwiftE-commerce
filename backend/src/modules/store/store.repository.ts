import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import {
  StoreSearchByNameOptions,
  StoreSearchOptions,
} from 'src/modules/store/types';
import { OrderStatus } from 'src/common/enums/order-status.enum';

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
   */
  async recalculateStats(storeId: string): Promise<void> {
    const stats = await this.manager
      .createQueryBuilder(Store, 's')
      .select('s.id')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(p.id)')
            .from('Product', 'p')
            .where('p.storeId = :storeId', { storeId })
            .andWhere('p.deletedAt IS NULL'),
        'productCount'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(sf.id)')
            .from('StoreFollower', 'sf')
            .where('sf.store.id = :storeId', { storeId }),
        'followerCount'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(o.id)')
            .from('Order', 'o')
            .where('o.storeId = :storeId', { storeId }),
        'orderCount'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COALESCE(SUM(o.totalAmount), 0)')
            .from('Order', 'o')
            .where('o.storeId = :storeId', { storeId })
            .andWhere('o.status = :status', { status: OrderStatus.DELIVERED }),
        'totalRevenue'
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(sf.id)')
            .from('StoreFollower', 'sf')
            .where('sf.store.id = :storeId', { storeId }),
        'followerCount'
      )
      .where('s.id = :storeId', { storeId })
      .getRawOne();

    if (!stats) {
      throw new NotFoundException('Store not found');
    }

    await this.update(storeId, {
      productCount: stats.productCount,
      followerCount: stats.followerCount,
      conversionRate: stats.conversionRate,
      orderCount: stats.orderCount,
      totalRevenue: parseFloat(stats.totalRevenue || '0'),
    });
  }

  /**
   * Recalculate stats for all stores (admin operation)
   * REFACTORED: This now uses a more efficient single query to update all stores at once.
   * This is a complex query and should be used with caution.
   */
  async recalculateAllStats(): Promise<void> {
    await this.manager.query(`
      UPDATE store s
      SET
        "productCount" = (SELECT COUNT(p.id) FROM product p WHERE p."storeId" = s.id AND p."deletedAt" IS NULL),
        "followerCount" = (SELECT COUNT(sf.id) FROM store_follower sf WHERE sf."storeId" = s.id),
        "orderCount" = (SELECT COUNT(o.id) FROM "order" o WHERE o."storeId" = s.id),
        "totalRevenue" = (SELECT COALESCE(SUM(o."totalAmount"), 0) FROM "order" o WHERE o."storeId" = s.id AND o.status = 'DELIVERED')
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
        qb.orderBy('store.followerCount', 'DESC');
        break;
    }

    qb.limit(limit);

    return await qb.getMany();
  }

  async advancedStoreSearch(filters: StoreSearchOptions) {
    const qb = this.createQueryBuilder('store').select([
      'store.id',
      'store.name',
      'store.description',
      'store.productCount',
      'store.followerCount',
      'store.logoUrl',
      'store.bannerUrl',
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
        'conversionRate',
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
        'conversionRate',
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
        'conversionRate',
        'orderCount',
        'createdAt',
        'updatedAt',
      ],
    });
  }
}
