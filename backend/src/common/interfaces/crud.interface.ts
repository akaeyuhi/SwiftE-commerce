export interface ICrudService<Entity, CreateDto, UpdateDto> {
  findAll(): Promise<Entity[]>;
  findOne(id: string): Promise<Entity>;
  create(dto: CreateDto): Promise<Entity>;
  update(id: string, dto: UpdateDto): Promise<Entity>;
  remove(id: string): Promise<void>;
}
