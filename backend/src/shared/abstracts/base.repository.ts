import { ObjectLiteral, Repository } from 'typeorm';

export abstract class BaseRepository<
  T extends ObjectLiteral,
> extends Repository<T> {
  async findAll(): Promise<T[]> {
    return this.find();
  }

  async findById(id: string): Promise<T | null> {
    return this.findOneBy({ id } as any);
  }

  async deleteById(id: string): Promise<void> {
    await this.delete(id);
  }
}
