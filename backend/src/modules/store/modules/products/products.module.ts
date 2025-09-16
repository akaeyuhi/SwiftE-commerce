import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/product.entity';
import { ProductRepository } from 'src/modules/store/modules/products/products.repository';
import { ProductsService } from 'src/modules/store/modules/products/products.service';
import { ProductsController } from 'src/modules/store/modules/products/products.controller';
import { ProductsMapper } from 'src/modules/store/modules/products/mappers/products.mapper';
import { CategoriesModule } from 'src/modules/store/modules/categories/categories.module';
import { ProductPhotoModule } from 'src/modules/store/modules/products/modules/product-photo/product-photo.module';
import { VariantsModule } from 'src/modules/store/modules/products/modules/variants/variants.module';
import { StoreModule } from 'src/modules/store/store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ProductPhotoModule,
    VariantsModule,
    forwardRef(() => CategoriesModule),
    forwardRef(() => StoreModule),
  ],
  providers: [ProductRepository, ProductsService, ProductsMapper],
  controllers: [ProductsController],
})
export class ProductsModule {}
