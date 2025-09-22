import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from 'src/modules/store/categories/categories.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { Category } from 'src/entities/store/product/category.entity';
import { UpdateCategoryDto } from 'src/modules/store/categories/dto/update-category.dto';
import { CreateCategoryDto } from 'src/modules/store/categories/dto/create-category.dto';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductsService } from 'src/modules/store/products/products.service';

/**
 * CategoriesService
 *
 * High-level category operations. Keeps business logic here and delegates:
 *  - category storage to CategoriesRepository
 *  - product related operations to ProductsService
 *
 * This prevents controllers/services from reaching into repositories of other
 * modules and centralizes the ManyToMany assignment semantics.
 */
@Injectable()
export class CategoriesService extends BaseService<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(
    private readonly categoriesRepo: CategoriesRepository,
    private readonly productService: ProductsService
  ) {
    super(categoriesRepo);
  }

  /**
   * Create a category and optionally attach a parent.
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
   * Update category (name, description, parent).
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
   * Return category with immediate children (delegates to repository).
   */
  async findWithChildren(id: string): Promise<Category | null> {
    return this.categoriesRepo.findWithChildren(id);
  }

  /**
   * Build an in-memory tree of categories (roots with nested children arrays).
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
   * Find products for a category (ManyToMany). Delegates to ProductsService.
   *
   * @param categoryId - category id
   * @param storeId - optional store id to limit to a store
   */
  async findProductsByCategory(
    categoryId: string,
    storeId?: string
  ): Promise<Product[]> {
    // Delegate to ProductsService which encapsulates repository access
    return this.productService.findProductsByCategory(categoryId, storeId);
  }

  /**
   * Assign (attach) an existing category to a product (ManyToMany).
   *
   * @param categoryId
   * @param productId
   */
  async assignCategoryToProduct(
    categoryId: string,
    productId: string
  ): Promise<Product> {
    // Delegate to ProductsService to mutate product.categories in one place
    return this.productService.attachCategoryToProduct(productId, categoryId);
  }

  /**
   * Find categories referenced by products in a store (distinct).
   *
   * @param storeId - store id
   */
  async findCategoriesByStore(storeId: string): Promise<Category[]> {
    return this.categoriesRepo.findCategoriesByStore(storeId);
  }
}
