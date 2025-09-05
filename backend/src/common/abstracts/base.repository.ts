import { DeepPartial, ObjectLiteral, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository<
  Entity extends ObjectLiteral,
> extends Repository<Entity> {
  async findAll(): Promise<Entity[]> {
    return this.find();
  }

  async findById(id: string): Promise<Entity | null> {
    return this.findOneBy({ id } as any);
  }

  async deleteById(id: string): Promise<void> {
    await this.delete(id);
  }

  async createEntity(data: DeepPartial<Entity>): Promise<Entity> {
    const entity = this.create(data);
    return await this.save(entity);
  }

  async updateEntity(id: string, data: Partial<Entity>): Promise<Entity> {
    const admin = await this.findById(id);
    if (!admin) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    await this.update(id, data);
    return admin;
  }
}
