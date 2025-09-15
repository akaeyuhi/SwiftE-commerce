import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { Category } from 'src/entities/category.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Product } from 'src/entities/product.entity';

/**
 * CategoriesService
 *
 * This implementation assumes `Product.categories` is a ManyToMany relation
 * (Product may belong to many categories and Category may contain many products).
 *
 * Responsibilities:
 *  - create / update / delete categories (with parent wiring),
 *  - build an in-memory category tree,
 *  - query products by category (optionally filtered to a store),
 *  - assign a category to a product (ManyToMany semantics),
 *  - list categories used by a store.
 */
//TODO finish something i forgor
@Injectable()
export class CategoriesService extends BaseService<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(
    private readonly categoriesRepo: CategoriesRepository,
    /**
     * Product repository is required for product-related operations
     * (finding products by category, assigning category to product).
     * Use your concrete ProductRepository or a BaseRepository<Product>.
     */
    private readonly productRepo: BaseRepository<Product>
  ) {
    super(categoriesRepo);
  }

  /**
   * Create a category and optionally attach a parent.
   *
   * @param dto - CreateCategoryDto
   * @returns saved Category
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    const partial: any = {
      name: dto.name,
      description: dto.description,
    };

    if (dto.parentId) {
      const parent = await this.categoriesRepo.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Parent category not found');
      partial.parent = { id: dto.parentId };
    }

    return this.categoriesRepo.createEntity(partial);
  }

  /**
   * Update category by id. Handles changing parent, name, description.
   *
   * @param id - category id
   * @param dto - UpdateCategoryDto
   * @returns updated Category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.categoriesRepo.findById(id);
    if (!existing) throw new NotFoundException('Category not found');

    if (dto.parentId === id) {
      throw new BadRequestException('Category cannot be parent of itself');
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        existing.parent = undefined;
      } else {
        const parent = await this.categoriesRepo.findById(dto.parentId);
        if (!parent) throw new NotFoundException('Parent category not found');
        existing.parent = parent;
      }
    }

    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.description !== undefined) existing.description = dto.description;

    return this.categoriesRepo.save(existing);
  }

  /**
   * Fetch a category along with its immediate children.
   *
   * @param id - category id
   * @returns Category or null if not found
   */
  async findWithChildren(id: string): Promise<Category | null> {
    return this.categoriesRepo.findWithChildren(id);
  }

  /**
   * Build a category tree in-memory.
   *
   * Returns an array of root categories, each with nested `children` arrays.
   */
  async getTree(): Promise<Category[]> {
    const all = await this.categoriesRepo.findAllWithRelations();
    const map = new Map<string, Category & { children: Category[] }>();
    all.forEach((c) => {
      map.set(c.id, { ...c, children: [] });
    });

    const roots: Array<Category & { children: Category[] }> = [];
    for (const [, node] of map) {
      if (node.parent && node.parent.id) {
        const parent = map.get(node.parent.id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * Find products for a category (ManyToMany case).
   *
   * Queries products that are linked to the category via the join table.
   * Optionally restrict to products belonging to `storeId`.
   *
   * @param categoryId - category id
   * @param storeId - optional store id to filter products
   * @returns Product[] (empty array if none)
   */
  async findProductsByCategory(
    categoryId: string,
    storeId?: string
  ): Promise<Product[]> {
    if (!this.productRepo) {
      throw new BadRequestException('Product repository not available');
    }

    const qb = this.productRepo.createQueryBuilder('p');

    if (!qb) {
      // If repo doesn't support createQueryBuilder, fallback to find with relation conditions.
      // But for ManyToMany we prefer query builder; return empty array as safe default.
      return [];
    }

    qb.leftJoin('p.categories', 'c')
      .leftJoinAndSelect('p.store', 's')
      .where('c.id = :categoryId', { categoryId });

    if (storeId) {
      qb.andWhere('s.id = :storeId', { storeId });
    }

    return await qb.getMany();
  }

  /**
   * Assign category to a product (ManyToMany).
   *
   * Loads the product with its `categories` relation, pushes the category
   * if it isn't already present, and saves the product.
   *
   * @param categoryId
   * @param productId
   * @returns updated Product
   */
  async assignCategoryToProduct(
    categoryId: string,
    productId: string
  ): Promise<Product> {
    if (!this.productRepo) {
      throw new BadRequestException('Product repository not available');
    }

    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['categories', 'store'],
    });

    if (!product) throw new NotFoundException('Product not found');

    const category = await this.categoriesRepo.findById(categoryId);
    if (!category) throw new NotFoundException('Category not found');

    product.categories = product.categories ?? [];
    const already = product.categories.some(
      (c: Category) => c.id === category.id
    );
    if (!already) product.categories.push(category);

    return this.productRepo.save(product);
  }

  /**
   * Find categories referenced by products in a store (distinct).
   *
   * @param storeId - store id
   * @returns Category[]
   */
  async findCategoriesByStore(storeId: string): Promise<Category[]> {
    return this.categoriesRepo.findCategoriesByStore(storeId);
  }
}
