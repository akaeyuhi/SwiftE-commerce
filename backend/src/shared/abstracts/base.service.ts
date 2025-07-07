import { ICrudService } from '../interfaces/crud.interface';

export abstract class BaseService<T, CreateDto, UpdateDto>
  implements ICrudService<T, CreateDto, UpdateDto> {
  abstract findAll(): Promise<T[]>;
  abstract findOne(id: string): Promise<T>;
  abstract create(dto: CreateDto): Promise<T>;
  abstract update(id: string, dto: UpdateDto): Promise<T>;
  abstract remove(id: string): Promise<void>;
}
