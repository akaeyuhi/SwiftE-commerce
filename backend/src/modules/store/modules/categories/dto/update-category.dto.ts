import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from 'src/modules/store/modules/categories/dto/create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
