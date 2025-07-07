/* eslint-disable prettier/prettier */
import { ICrudService } from '../interfaces/crud.interface';
import { BaseMapper } from 'src/common/abstracts/base.mapper';

export abstract class BaseService<Entity, Dto>
  implements ICrudService<Entity, Dto> {
  protected constructor(protected readonly mapper: BaseMapper<Entity, Dto>) {}
  abstract findAll(): Promise<Entity[]>;
  abstract findOne(id: string): Promise<Entity>;
  abstract create(dto: Dto): Promise<Entity>;
  abstract update(id: string, dto: Partial<Dto>): Promise<Entity>;
  abstract remove(id: string): Promise<void>;
}
