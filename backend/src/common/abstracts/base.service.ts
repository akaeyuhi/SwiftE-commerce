/* eslint-disable prettier/prettier */
import { ICrudService } from '../interfaces/crud.interface';
import { BaseMapper } from 'src/common/abstracts/base.mapper';

export abstract class BaseService<
    Entity,
    CreateDto = Partial<Entity>,
    UpdateDto = Partial<Entity>,
    TransferDto = Partial<Entity>
>
  implements ICrudService<TransferDto, CreateDto, UpdateDto> {
  protected constructor(protected readonly mapper?: BaseMapper<Entity, TransferDto>) {}
  abstract findAll(): Promise<TransferDto[]>;
  abstract findOne(id: string): Promise<TransferDto>;
  abstract create(dto: CreateDto): Promise<TransferDto>;
  abstract update(id: string, dto: UpdateDto): Promise<TransferDto>;
  abstract remove(id: string): Promise<void>;
  getEntityById?(id: string): Promise<Entity | null>;
}
