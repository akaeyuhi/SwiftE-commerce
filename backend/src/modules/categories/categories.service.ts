import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from 'src/modules/categories/categories.repository';
import { BaseService } from 'src/common/abstracts/base.service';
import { Category } from 'src/entities/category.entity';
import { UpdateCategoryDto } from 'src/modules/categories/dto/update-category.dto';
import { CreateCategoryDto } from 'src/modules/categories/dto/create-category.dto';

@Injectable()
export class CategoriesService extends BaseService<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(private readonly categoriesRepo: CategoriesRepository) {
    super(categoriesRepo);
  }

  create(name: string, parentId?: string) {
    const c = this.categoriesRepo.create({
      name,
      parent: parentId ? ({ id: parentId } as any) : null,
    });
    return this.categoriesRepo.save(c);
  }
}
