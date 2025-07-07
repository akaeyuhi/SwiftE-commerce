export interface ICrudService<Dto, CreateDto, UpdateDto> {
  findAll(): Promise<Dto[]>;
  findOne(id: string): Promise<Dto>;
  create(dto: CreateDto): Promise<Dto>;
  update(id: string, dto: UpdateDto): Promise<Dto>;
  remove(id: string): Promise<void>;
}
