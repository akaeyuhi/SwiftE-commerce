import { Module } from '@nestjs/common';
import { CategoriesService } from 'src/modules/store/categories/categories.service';
import { CategoriesController } from 'src/modules/store/categories/categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/entities/store/product/category.entity';
import { CategoriesRepository } from 'src/modules/store/categories/categories.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
