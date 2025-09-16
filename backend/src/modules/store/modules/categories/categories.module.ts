import { Module } from '@nestjs/common';
import { CategoriesService } from 'src/modules/store/modules/categories/categories.service';
import { CategoriesController } from 'src/modules/store/modules/categories/categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/entities/category.entity';
import { CategoriesRepository } from 'src/modules/store/modules/categories/categories.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
