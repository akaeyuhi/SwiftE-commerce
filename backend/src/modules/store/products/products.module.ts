import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductRepository } from 'src/modules/store/products/products.repository';
import { ProductsService } from 'src/modules/store/products/products.service';
import { ProductsController } from 'src/modules/store/products/products.controller';
import { ProductsMapper } from 'src/modules/store/products/products.mapper';
import { ProductPhotoModule } from 'src/modules/store/products/product-photo/product-photo.module';
import { VariantsModule } from 'src/modules/store/products/variants/variants.module';
import { StoreModule } from 'src/modules/store/store.module';
import { CategoriesModule } from 'src/modules/store/categories/categories.module';

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
  exports: [ProductsService],
})
export class ProductsModule {}
