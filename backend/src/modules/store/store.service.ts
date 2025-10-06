import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Store } from 'src/entities/store/store.entity';
import { StoreRepository } from 'src/modules/store/store.repository';
import { StoreDto } from 'src/modules/store/dto/store.dto';
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

  async hasUserStoreRole(storeRole: StoreRole) {
    const store = await this.storeRepo.findById(storeRole.store.id);
    if (!store) throw new BadRequestException('Store not found');
    return store.storeRoles.some(
      (role) =>
          role.user.id === storeRole.user.id &&
          role.roleName === storeRole.roleName
    );
  }
}
