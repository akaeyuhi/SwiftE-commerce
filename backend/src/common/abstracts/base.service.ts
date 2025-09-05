import { ICrudService } from '../interfaces/crud.interface';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { DeepPartial, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseService<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Entity,
  // eslint-disable-next-line
> implements ICrudService<Entity, CreateDto, UpdateDto, TransferDto> {
  protected constructor(
    protected readonly repository: BaseRepository<Entity>,
    protected readonly mapper?: BaseMapper<Entity, TransferDto>
  ) {}

  async create(dto: CreateDto): Promise<TransferDto | Entity> {
    const newEntity = await this.repository.createEntity(
      dto as DeepPartial<Entity>
    );
    return this.mapper?.toDto(newEntity) ?? newEntity;
  }

  async findAll(): Promise<TransferDto[] | Entity[]> {
    const entities = await this.repository.findAll();
    return this.mapper?.toDtoList(entities) ?? entities;
  }

  async findOne(id: string): Promise<TransferDto | Entity> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException('User not found');
    return this.mapper?.toDto(entity) ?? (entity as any);
  }

  async update(id: string, dto: UpdateDto): Promise<Entity | TransferDto> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException('Entity not found');
    Object.assign(entity, dto);
    const updated = await this.repository.save(entity);
    return this.mapper?.toDto(updated) ?? updated;
  }

  async remove(id: string): Promise<void> {
    const res = await this.repository.delete(id);
    if (res.affected === 0) throw new NotFoundException('Entity not found');
  }

  async getEntityById(id: string): Promise<Entity | null> {
    return this.repository.findById(id);
  }
}
