import { Injectable } from '@nestjs/common';
import { Category } from 'src/entities/store/category.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { DataSource } from 'typeorm';

/**
 * CategoriesRepository
 *
 * Extends BaseRepository and adds a few category-specific helpers.
 *
 */
@Injectable()
export class CategoriesRepository extends BaseRepository<Category> {
  constructor(dataSource: DataSource) {
    super(Category, dataSource.createEntityManager());
  }
  /**
   * Load a category with its immediate children.
   */
  async findWithChildren(id: string): Promise<Category | null> {
    return this.findOne({
      where: { id } as any,
      relations: ['children'],
    });
  }

  /**
   * Load all categories with parent/children relations (shallow).
   * Useful to build a tree in memory.
   */
  async findAllWithRelations(): Promise<Category[]> {
    return this.find({
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Find categories that are referenced by products belonging to the specified store.
   * This works in two cases:
   *  - Product has a ManyToOne 'category' => categories are joined via c.products -> p where p.store = :storeId
   *  - Product has ManyToMany 'categories' => same join works because TypeORM maps join table automatically
   *
   * Returns distinct categories used by the store's products.
   */
  async findCategoriesByStore(storeId: string): Promise<Category[]> {
    // Use query builder to join products and their store relation
    const qb = this.createQueryBuilder('c')
      .leftJoin('c.products', 'p')
      .leftJoin('p.store', 's')
      .where('s.id = :storeId', { storeId })
      .distinct(true)
      .orderBy('c.name', 'ASC');

    return qb.getMany();
  }
}
