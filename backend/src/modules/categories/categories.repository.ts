import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Category } from 'src/entities/category.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class CategoriesRepository extends BaseRepository<Category> {
  constructor(dataSource: DataSource) {
    super(Category, dataSource.createEntityManager());
  }
}
