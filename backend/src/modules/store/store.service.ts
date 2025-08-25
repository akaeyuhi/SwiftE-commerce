import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Store } from 'src/entities/store.entity';
import { StoreRepository } from 'src/modules/store/store.repository';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { StoreMapper } from 'src/modules/store/store.mapper';

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
    super(mapper);
  }
  async findAll(): Promise<StoreDto[]> {
    const stores = await this.storeRepo.find();
    return this.mapper.toDtoList(stores);
  }

  async findOne(id: string): Promise<StoreDto> {
    const store = await this.storeRepo.findOneBy({ id });
    if (!store) throw new NotFoundException('User not found');
    return this.mapper.toDto(store);
  }

  async create(dto: CreateStoreDto): Promise<StoreDto> {
    const existing = await this.storeRepo.findStoreByName(dto.name);
    if (existing) throw new BadRequestException('Store name already in use');
    const store = this.mapper.toEntity(dto as any);
    const saved = await this.storeRepo.save(store);
    return this.mapper.toDto(saved);
  }

  async update(id: string, dto: UpdateStoreDto): Promise<StoreDto> {
    const store = await this.storeRepo.findById(id);
    if (!store) throw new NotFoundException('Store not found');
    Object.assign(store, dto);
    const updated = await this.storeRepo.save(store);
    return this.mapper.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    const res = await this.storeRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException('User not found');
  }

  async getEntityById(id: string): Promise<Store | null> {
    return this.storeRepo.findById(id);
  }
}
