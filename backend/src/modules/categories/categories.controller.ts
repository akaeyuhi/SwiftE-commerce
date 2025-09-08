import { Controller, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Category } from 'src/entities/category.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

@Controller('stores/:storeId/products/:productId/categories')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class CategoriesController extends BaseController<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(private readonly categoriesService: CategoriesService) {
    super(categoriesService);
  }
}
