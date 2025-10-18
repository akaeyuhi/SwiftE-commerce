import { Injectable } from '@nestjs/common';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import {
  StoreDto,
  StoreListDto,
  StoreStatsDto,
} from 'src/modules/store/dto/store.dto';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class StoreMapper extends BaseMapper<Store, StoreDto> {
  toDto(entity: Store): StoreDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      ownerId: entity.ownerId,
      owner: entity.owner,

      // Include cached stats
      productCount: entity.productCount,
      followerCount: entity.followerCount,
      totalRevenue: entity.totalRevenue,
      orderCount: entity.orderCount,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,

      // Relations (only if loaded)
      products: entity.products,
      orders: entity.orders,
      carts: entity.carts,
      newsPosts: entity.newsPosts,
      aiLogs: entity.aiLogs,
      storeRoles: entity.storeRoles,
    };
  }

  toEntity(dto: StoreDto): Store {
    const store = new Store();
    if (dto.id) store.id = dto.id;
    store.name = dto.name!;
    store.description = dto.description;
    store.ownerId = dto.ownerId;

    // Don't manually set cached values - triggers handle them
    // But if you're creating from a DTO that has values, preserve them
    if (dto.productCount !== undefined) store.productCount = dto.productCount;
    if (dto.followerCount !== undefined)
      store.followerCount = dto.followerCount;
    if (dto.totalRevenue !== undefined) store.totalRevenue = dto.totalRevenue;
    if (dto.orderCount !== undefined) store.orderCount = dto.orderCount;

    return store;
  }

  // Map to lightweight list DTO (for performance)
  toListDto(entity: Store): StoreListDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      productCount: entity.productCount || 0,
      followerCount: entity.followerCount || 0,
      totalRevenue: entity.totalRevenue || 0,
      orderCount: entity.orderCount || 0,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // Map to stats DTO with calculated fields
  toStatsDto(entity: Store): StoreStatsDto {
    const averageOrderValue =
      entity.orderCount && entity.orderCount > 0
        ? Number(entity.totalRevenue) / entity.orderCount
        : 0;

    return {
      id: entity.id,
      name: entity.name,
      productCount: entity.productCount || 0,
      followerCount: entity.followerCount || 0,
      totalRevenue: entity.totalRevenue || 0,
      orderCount: entity.orderCount || 0,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    };
  }
}
