/* eslint-disable prettier/prettier */
import { ICrudService } from '../interfaces/crud.interface';
import { BaseMapper } from 'src/common/abstracts/base.mapper';

export abstract class BaseService<Entity, Dto, CreateDto, UpdateDto>
  implements ICrudService<Dto, CreateDto, UpdateDto> {
  protected constructor(protected readonly mapper: BaseMapper<Entity, Dto>) {}
  abstract findAll(): Promise<Dto[]>;
  abstract findOne(id: string): Promise<Dto>;
  abstract create(dto: CreateDto): Promise<Dto>;
  abstract update(id: string, dto: UpdateDto): Promise<Dto>;
  abstract remove(id: string): Promise<void>;
}
