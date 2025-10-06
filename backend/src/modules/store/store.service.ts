import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Store } from 'src/entities/store/store.entity';
import { StoreRepository } from 'src/modules/store/store.repository';
import {
  StoreDto,
  StoreListDto,
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
}
