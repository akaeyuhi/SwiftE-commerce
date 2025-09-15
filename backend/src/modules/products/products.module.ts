import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/product.entity';
import { ProductRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsMapper } from './mappers/products.mapper';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { ProductPhotoModule } from 'src/modules/products/product-photo/product-photo.module';
import { VariantsModule } from 'src/modules/variants/variants.module';
import { StoreModule } from 'src/modules/store/store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CategoriesModule,
    ProductPhotoModule,
    VariantsModule,
    forwardRef(() => StoreModule),
  ],
  providers: [ProductRepository, ProductsService, ProductsMapper],
  controllers: [ProductsController],
})
export class ProductsModule {}
