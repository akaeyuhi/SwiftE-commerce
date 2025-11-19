import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { AdvancedStoreSearchDto } from './dto/advanced-store-search.dto';
import { Store } from 'src/entities/store/store.entity';
import { StoreRepository } from 'src/modules/store/store.repository';
import {
  StoreDto,
  StoreListDto,
  StoreOverviewDto,
  StoreSearchResultDto,
  StoreStatsDto,
} from 'src/modules/store/dto/store.dto';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { StoreFileService } from './store-file/store-file.service';
import { PaginatedService } from 'src/common/abstracts/paginated.service';
import { Order } from 'src/entities/store/product/order.entity';
import { StoreSearchOptions } from 'src/modules/store/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Category } from 'src/entities/store/product/category.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Injectable()
export class StoreService extends PaginatedService<
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  StoreDto,
  StoreSearchResultDto
> {
  constructor(
    private readonly storeRepo: StoreRepository,
    protected readonly mapper: StoreMapper,
    private readonly storeFileService: StoreFileService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>
  ) {
    super(storeRepo, mapper);
  }

  async paginate(
    searchDto: AdvancedStoreSearchDto
  ): Promise<[StoreSearchResultDto[], number]> {
    const { limit, offset } = searchDto;
    const { stores, total } = await this.storeRepo.advancedStoreSearch({
      ...searchDto,
      limit,
      offset,
    });

    const storeDtos = stores.map((store) => ({
      ...this.mapper.toListDto(store),
      matchType: 'none' as const,
    }));

    return [storeDtos, total];
  }

  async findOneWithTeam(id: string): Promise<Store | null> {
    return this.storeRepo.findOne({
      where: { id },
      relations: ['storeRoles', 'storeRoles.user'],
    });
  }

  async uploadFiles(
    storeId: string,
    logoFile?: Express.Multer.File,
    bannerFile?: Express.Multer.File
  ): Promise<StoreDto> {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (logoFile) {
      store.logoUrl = await this.storeFileService.saveFile(
        logoFile,
        storeId,
        'logo'
      );
    }

    if (bannerFile) {
      store.bannerUrl = await this.storeFileService.saveFile(
        bannerFile,
        storeId,
        'banner'
      );
    }

    const updatedStore = await this.storeRepo.save(store);
    return this.mapper.toDto(updatedStore);
  }

  async count(searchParams: any) {
    return this.storeRepo.count(searchParams);
  }

  async create(dto: CreateStoreDto): Promise<StoreDto> {
    const existing = await this.storeRepo.findStoreByName(dto.name);
    if (existing) throw new BadRequestException('Store name already in use');

    const store = this.mapper.toEntity(dto as any);
    const saved = await this.storeRepo.save(store);

    await this.uploadFiles(store.id, dto.logoFile, dto.bannerFile);

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
    const stores = await this.storeRepo.findAllWithStats();

    return stores.map((store) => this.mapper.toListDto(store));
  }

  /**
   * Get store statistics
   */
  async getStoreStats(storeId: string): Promise<StoreStatsDto> {
    const store = await this.storeRepo.findStoreStats(storeId);

    if (!store) throw new NotFoundException('Store not found');

    return this.mapper.toStatsDto(store);
  }

  async getStoreOverview(storeId: string): Promise<StoreOverviewDto> {
    const stats = await this.getStoreStats(storeId);
    const recentOrders = await this.getRecentOrders(storeId);
    const topProducts = await this.getTopStoreProducts(storeId);
    return {
      stats,
      recentOrders,
      topProducts,
    };
  }

  async getRecentOrders(storeId: string, limit = 5): Promise<Order[]> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      relations: ['orders', 'orders.items'],
      order: { id: 'DESC' },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store.orders.slice(0, limit);
  }

  async getTopStoreProducts(storeId: string, limit = 5) {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      relations: ['products'],
      order: { id: 'DESC' },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store.products.slice(0, limit);
  }

  /**
   * Manually recalculate store statistics (for data integrity checks)
   * NOTE: The N+1 problem in this method has been fixed in the StoreRepository.
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
    const stores = await this.storeRepo.findTopStoresByFollowers(limit);

    return stores.map((store) => this.mapper.toStatsDto(store));
  }

  async recalculateAllStoreStats(): Promise<void> {
    await this.storeRepo.recalculateAllStats();
  }

  async checkStoreDataHealth(storeId: string) {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: ['id', 'name', 'productCount', 'orderCount', 'totalRevenue'],
    });

    if (!store) throw new BadRequestException('Store not found');

    const [
      actualProductCount,
      productsWithoutVariants,
      productsWithoutCategory,
      categoryStats,
      variantStats,
      orderStats,
    ] = await Promise.all([
      this.productRepo.count({
        where: { storeId },
      }),

      this.productRepo
        .createQueryBuilder('p')
        .leftJoin('p.variants', 'v')
        .where('p.storeId = :storeId', { storeId })
        .groupBy('p.id')
        .having('COUNT(v.id) = 0')
        .getCount(),

      this.productRepo
        .createQueryBuilder('p')
        .leftJoin('p.categories', 'c')
        .where('p.storeId = :storeId', { storeId })
        .groupBy('p.id')
        .having('COUNT(c.id) = 0')
        .getCount(),

      this.categoryRepo
        .createQueryBuilder('cat')
        .leftJoin('cat.products', 'p')
        .where('cat.storeId = :storeId', { storeId })
        .select('COUNT(DISTINCT cat.id)', 'total')
        .addSelect(
          'COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.deletedAt IS NULL THEN cat.id END)',
          'withProducts'
        )
        .getRawOne(),

      this.variantRepo
        .createQueryBuilder('v')
        .leftJoin('v.product', 'p')
        .where('p.storeId = :storeId', { storeId })
        .select('COUNT(v.id)', 'count')
        .getRawOne(),

      this.orderRepo
        .createQueryBuilder('o')
        .where('o.storeId = :storeId', { storeId })
        .select('COUNT(o.id)', 'totalOrders')
        .addSelect(
          'COALESCE(SUM(CASE WHEN o.status IN (:...completedStatuses) ' +
            'THEN o.totalAmount ELSE 0 END), 0)',
          'totalRevenue'
        )
        .setParameter('completedStatuses', [
          OrderStatus.DELIVERED,
          OrderStatus.SHIPPED,
        ])
        .getRawOne(),
    ]);

    const totalCategories = parseInt(categoryStats?.total || '0', 10);
    const categoriesWithProducts = parseInt(
      categoryStats?.withProducts || '0',
      10
    );
    const emptyCategoriesCount = totalCategories - categoriesWithProducts;
    const totalVariants = parseInt(variantStats?.count || '0', 10);
    const actualOrderCount = parseInt(orderStats?.totalOrders || '0', 10);
    const actualTotalRevenue = parseFloat(orderStats?.totalRevenue || '0');

    const cachedProductCount = store.productCount || 0;
    const cachedOrderCount = store.orderCount || 0;
    const cachedTotalRevenue = parseFloat(
      store.totalRevenue?.toString() || '0'
    );

    // ✅ Calculate health
    const issues = [
      cachedProductCount !== actualProductCount,
      cachedOrderCount !== actualOrderCount,
      Math.abs(cachedTotalRevenue - actualTotalRevenue) > 0.01,
      productsWithoutVariants > 0,
      productsWithoutCategory > 0,
      emptyCategoriesCount > totalCategories * 0.3,
    ];

    const healthScore = Math.round(
      ((issues.length - issues.filter(Boolean).length) / issues.length) * 100
    );

    let healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
    if (healthScore >= 90) healthStatus = 'EXCELLENT';
    else if (healthScore >= 75) healthStatus = 'GOOD';
    else if (healthScore >= 50) healthStatus = 'WARNING';
    else healthStatus = 'CRITICAL';

    return {
      storeId,
      storeName: store.name,
      healthScore,
      healthStatus,
      checkedAt: new Date(),

      // ✅ Metrics with all counts
      metrics: {
        productCount: {
          cached: cachedProductCount,
          actual: actualProductCount,
          match: cachedProductCount === actualProductCount,
          difference: actualProductCount - cachedProductCount,
        },
        orderCount: {
          cached: cachedOrderCount,
          actual: actualOrderCount,
          match: cachedOrderCount === actualOrderCount,
          difference: actualOrderCount - cachedOrderCount,
        },
        totalRevenue: {
          cached: cachedTotalRevenue,
          actual: actualTotalRevenue,
          match: Math.abs(cachedTotalRevenue - actualTotalRevenue) < 0.01,
          difference: actualTotalRevenue - cachedTotalRevenue,
        },
        variantCount: {
          actual: totalVariants,
          cached: 0, // Not cached in store entity
          match: true,
          difference: 0,
        },
        categoryCount: {
          actual: totalCategories,
          cached: 0, // Not cached in store entity
          match: true,
          difference: 0,
        },
      },

      products: {
        total: actualProductCount,
        withoutVariants: productsWithoutVariants,
        withoutCategory: productsWithoutCategory,
        totalVariants,
        avgVariantsPerProduct:
          actualProductCount > 0
            ? Math.round((totalVariants / actualProductCount) * 10) / 10
            : 0,
      },

      categories: {
        total: totalCategories,
        withProducts: categoriesWithProducts,
        empty: emptyCategoriesCount,
        utilizationPercentage: Math.round(
          (categoriesWithProducts / (totalCategories || 1)) * 100
        ),
      },

      orders: {
        total: actualOrderCount,
        totalRevenue: actualTotalRevenue,
        avgOrderValue:
          actualOrderCount > 0
            ? Math.round((actualTotalRevenue / actualOrderCount) * 100) / 100
            : 0,
      },

      recommendations: [
        ...(cachedProductCount !== actualProductCount
          ? [
              {
                type: 'CRITICAL' as const,
                message: `Product count mismatch (${Math.abs(actualProductCount - cachedProductCount)} difference)`,
                action: 'Recalculate product count',
              },
            ]
          : []),
        ...(cachedOrderCount !== actualOrderCount
          ? [
              {
                type: 'CRITICAL' as const,
                message: `Order count mismatch (${Math.abs(actualOrderCount - cachedOrderCount)} difference)`,
                action: 'Recalculate order count',
              },
            ]
          : []),
        ...(Math.abs(cachedTotalRevenue - actualTotalRevenue) > 0.01
          ? [
              {
                type: 'CRITICAL' as const,
                message: `Revenue mismatch ($${Math.abs(actualTotalRevenue - cachedTotalRevenue).toFixed(2)} difference)`,
                action: 'Recalculate total revenue',
              },
            ]
          : []),
        ...(productsWithoutVariants > 0
          ? [
              {
                type: 'WARNING' as const,
                message: `${productsWithoutVariants} products without variants`,
                action: 'Add variants',
              },
            ]
          : []),
        ...(productsWithoutCategory > 0
          ? [
              {
                type: 'INFO' as const,
                message: `${productsWithoutCategory} products without categories`,
                action: 'Assign categories',
              },
            ]
          : []),
        ...(emptyCategoriesCount > 0
          ? [
              {
                type: 'INFO' as const,
                message: `${emptyCategoriesCount} empty categories`,
                action: 'Add products or remove categories',
              },
            ]
          : []),
      ],

      needsRecalculation:
        cachedProductCount !== actualProductCount ||
        cachedOrderCount !== actualOrderCount ||
        Math.abs(cachedTotalRevenue - actualTotalRevenue) > 0.01,
    };
  }

  // ===============================
  // Helper Methods
  // ===============================

  private determineMatchType(
    storeName: string,
    query: string
  ): 'exact' | 'startsWith' | 'contains' | 'none' {
    const lowerName = storeName.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerName === lowerQuery) return 'exact';
    if (lowerName.startsWith(lowerQuery)) return 'startsWith';
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
      sortBy?: 'followers' | 'revenue' | 'products' | 'recent';
      minFollowers?: number;
      minProducts?: number;
    }
  ): Promise<StoreSearchResultDto[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const searchTerms = normalizedQuery.split(/\s+/);

    const results = await this.storeRepo.searchStoreByName(
      normalizedQuery,
      limit,
      searchTerms,
      options
    );

    return results.map((result) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      productCount: result.productCount || 0,
      followerCount: result.followerCount || 0,
      totalRevenue: result.totalRevenue || 0,
      orderCount: result.orderCount || 0,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      matchType: this.determineMatchType(result.name, normalizedQuery),
    }));
  }

  /**
   * Advanced store search with filters
   */
  async advancedStoreSearch(
    filters: StoreSearchOptions
  ): Promise<{ stores: StoreSearchResultDto[]; total: number }> {
    const { total, stores } = await this.storeRepo.advancedStoreSearch(filters);
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

  /**
   * Soft delete a product
   */
  async softDelete(id: string): Promise<void> {
    await this.storeRepo.softDelete(id);
  }
}
