import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Store } from 'src/entities/store/store.entity';
import { StoreRepository } from 'src/modules/store/store.repository';
import {
  StoreDto,
  StoreListDto,
  StoreSearchResultDto,
  StoreStatsDto,
} from 'src/modules/store/dto/store.dto';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';

@Injectable()
export class StoreService extends BaseService<
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  StoreDto
> {
  constructor(
    private readonly storeRepo: StoreRepository,
    protected readonly mapper: StoreMapper
  ) {
    super(storeRepo, mapper);
  }

  async create(dto: CreateStoreDto): Promise<StoreDto> {
    const existing = await this.storeRepo.findStoreByName(dto.name);
    if (existing) throw new BadRequestException('Store name already in use');

    const store = this.mapper.toEntity(dto as any);
    const saved = await this.storeRepo.save(store);

    return this.mapper.toDto(saved);
  }

  async hasUserStoreRole(storeRole: StoreRole): Promise<boolean> {
    const store = await this.storeRepo.findById(storeRole.store.id);
    if (!store) throw new BadRequestException('Store not found');

    return store.storeRoles.some(
      (role) =>
        role.user.id === storeRole.user.id &&
        role.roleName === storeRole.roleName
    );
  }

  /**
   * Get all stores with lightweight stats (no relations)
   * Useful for listing pages
   */
  async findAllWithStats(): Promise<StoreListDto[]> {
    const stores = await this.storeRepo.find({
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

    return stores.map((store) => this.mapper.toListDto(store));
  }

  /**
   * Get store statistics
   */
  async getStoreStats(storeId: string): Promise<StoreStatsDto> {
    const store = await this.storeRepo.findOne({
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

    if (!store) throw new BadRequestException('Store not found');

    return this.mapper.toStatsDto(store);
  }

  /**
   * Manually recalculate store statistics (for data integrity checks)
   * This bypasses the triggers and recalculates from actual data
   */
  async recalculateStoreStats(storeId: string): Promise<void> {
    await this.storeRepo.recalculateStats(storeId);
  }

  /**
   * Get top stores by revenue
   */
  async getTopStoresByRevenue(limit: number = 10): Promise<StoreStatsDto[]> {
    const stores = await this.storeRepo.findTopByRevenue(limit);
    return stores.map((store) => this.mapper.toStatsDto(store));
  }

  /**
   * Get top stores by product count
   */
  async getTopStoresByProducts(limit: number = 10): Promise<StoreStatsDto[]> {
    const stores = await this.storeRepo.findTopByProductCount(limit);
    return stores.map((store) => this.mapper.toStatsDto(store));
  }

  async getTopStoresByFollowers(limit: number = 10): Promise<StoreStatsDto[]> {
    const stores = await this.storeRepo.find({
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

    return stores.map((store) => this.mapper.toStatsDto(store));
  }

  async recalculateAllStoreStats(): Promise<void> {
    await this.storeRepo.recalculateAllStats();
  }

  async checkStoreDataHealth(storeId: string) {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      relations: ['products'],
    });

    if (!store) throw new BadRequestException('Store not found');

    const actualProductCount =
      store.products?.filter((p) => !p.deletedAt).length || 0;
    const cachedProductCount = store.productCount || 0;

    return {
      storeId,
      health: {
        productCount: {
          cached: cachedProductCount,
          actual: actualProductCount,
          match: cachedProductCount === actualProductCount,
        },
      },
      needsRecalculation: cachedProductCount !== actualProductCount,
    };
  }

  // ===============================
  // Helper Methods
  // ===============================

  private determineMatchType(
    storeName: string,
    query: string
  ): 'exact' | 'starts_with' | 'contains' | 'none' {
    const lowerName = storeName.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerName === lowerQuery) return 'exact';
    if (lowerName.startsWith(lowerQuery)) return 'starts_with';
    if (lowerName.includes(lowerQuery)) return 'contains';
    return 'none';
  }

  /**
   * Search stores by name with fuzzy matching and relevance scoring
   */
  async searchStoresByName(
    query: string,
    limit: number = 20,
    options?: {
      sortBy?: 'relevance' | 'followers' | 'revenue' | 'products' | 'recent';
      minFollowers?: number;
      minProducts?: number;
    }
  ): Promise<StoreSearchResultDto[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const searchTerms = normalizedQuery.split(/\s+/);

    // Build base query
    const qb = this.storeRepo
      .createQueryBuilder('store')
      .select([
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
        { query: `%${normalizedQuery}%` }
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
      .setParameter('exactQuery', normalizedQuery)
      .setParameter('startsWithQuery', `${normalizedQuery}%`)
      .setParameter('query', `%${normalizedQuery}%`);

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
      case 'relevance':
      default:
        qb.orderBy('relevanceScore', 'DESC').addOrderBy(
          'store.followerCount',
          'DESC'
        );
        break;
    }

    qb.limit(limit);

    const results = await qb.getRawMany();

    return results.map((result) => ({
      id: result.store_id,
      name: result.store_name,
      description: result.store_description,
      productCount: result.store_productCount || 0,
      followerCount: result.store_followerCount || 0,
      totalRevenue: parseFloat(result.store_totalRevenue) || 0,
      orderCount: result.store_orderCount || 0,
      createdAt: result.store_createdAt,
      updatedAt: result.store_updatedAt,
      relevanceScore: parseFloat(result.relevanceScore) || 0,
      matchType: this.determineMatchType(result.store_name, normalizedQuery),
    }));
  }

  /**
   * Advanced store search with filters
   */
  async advancedStoreSearch(filters: {
    query?: string;
    minRevenue?: number;
    maxRevenue?: number;
    minProducts?: number;
    maxProducts?: number;
    minFollowers?: number;
    maxFollowers?: number;
    sortBy?: 'name' | 'revenue' | 'followers' | 'products' | 'recent';
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ stores: StoreSearchResultDto[]; total: number }> {
    const qb = this.storeRepo
      .createQueryBuilder('store')
      .select([
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

    return {
      stores: stores.map((store) => ({
        id: store.id,
        name: store.name,
        description: store.description,
        productCount: store.productCount || 0,
        followerCount: store.followerCount || 0,
        totalRevenue: parseFloat(store.totalRevenue as any) || 0,
        orderCount: store.orderCount || 0,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        relevanceScore: 0,
        matchType: 'none',
      })),
      total,
    };
  }

  /**
   * Search stores with autocomplete suggestions
   */
  async autocompleteStores(
    query: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      name: string;
      followerCount: number;
    }>
  > {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    const stores = await this.storeRepo
      .createQueryBuilder('store')
      .select(['store.id', 'store.name', 'store.followerCount'])
      .where('LOWER(store.name) LIKE :query', { query: `${normalizedQuery}%` })
      .orderBy('store.followerCount', 'DESC')
      .limit(limit)
      .getMany();

    return stores.map((store) => ({
      id: store.id,
      name: store.name,
      followerCount: store.followerCount || 0,
    }));
  }
}
