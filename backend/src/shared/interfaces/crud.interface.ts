export interface ICrudService<T, CreateDto, UpdateDto> {
  findAll(): Promise<T[]>;
  findOne(id: string): Promise<T>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  remove(id: string): Promise<void>;
}
