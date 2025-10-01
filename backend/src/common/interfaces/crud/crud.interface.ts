import { ObjectLiteral } from 'typeorm';

export interface ICrudService<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Partial<Entity>,
> {
  findAll(): Promise<Entity[] | TransferDto[]>;
  findOne(id: string): Promise<Entity | TransferDto>;
  create(dto: CreateDto): Promise<Entity | TransferDto>;
  update(id: string, dto: UpdateDto): Promise<Entity | TransferDto>;
  remove(id: string): Promise<void>;
}
