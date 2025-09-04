import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from 'src/modules/categories/categories.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { Category } from 'src/entities/category.entity';
import { UpdateCategoryDto } from 'src/modules/categories/dto/update-category.dto';
import { CreateCategoryDto } from 'src/modules/categories/dto/create-category.dto';

@Injectable()
export class CategoryService extends BaseService<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(private readonly categoriesRepo: CategoriesRepository) {
    super();
  }

  create(name: string, parentId?: string) {
    const c = this.categoriesRepo.create({
      name,
      parent: parentId ? ({ id: parentId } as any) : null,
    });
    return this.categoriesRepo.save(c);
  }

  findAll() {
    return this.categoriesRepo.findAll();
  }
  async findOne(id: string) {
    const category = await this.categoriesRepo.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepo.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }
  async remove(id: string): Promise<void> {
    const res = await this.categoriesRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException('Category not found');
  }
}
