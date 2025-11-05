import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { StoreSearchOptions } from 'src/modules/store/types';
import { StoreFileService } from './store-file/store-file.service';

@Injectable()
export class StoreService extends BaseService<
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  StoreDto
> {
  constructor(
    private readonly storeRepo: StoreRepository,
    protected readonly mapper: StoreMapper,
    private readonly storeFileService: StoreFileService
  ) {
    super(storeRepo, mapper);
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
