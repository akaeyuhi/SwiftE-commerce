export interface ICrudService<T, Dto> {
  findAll(): Promise<T[]>;
  findOne(id: string): Promise<T>;
  create(dto: Dto): Promise<T>;
  update(id: string, dto: Partial<Dto>): Promise<T>;
  remove(id: string): Promise<void>;
}
