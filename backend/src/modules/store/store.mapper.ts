import { Injectable } from '@nestjs/common';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class StoreMapper extends BaseMapper<Store, StoreDto> {
  toDto(entity: Store): StoreDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      owner: entity.owner,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      products: entity.products,
      orders: entity.orders,
      carts: entity.carts,
      newsPosts: entity.newsPosts,
      aiLogs: entity.aiLogs,
      userRoles: entity.userRoles,
    };
  }

  toEntity(dto: StoreDto): Store {
    const store = new Store();
    if (dto.id) store.id = dto.id;
    store.name = dto.name!;
    store.description = dto.description;
    store.owner = dto.owner;
    return store;
  }
}
