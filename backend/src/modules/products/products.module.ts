import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductRepository } from 'src/modules/products/products.repository';
import { ProductsService } from 'src/modules/products/products.service';
import { ProductsController } from 'src/modules/products/products.controller';
import { ProductsMapper } from 'src/modules/products/products.mapper';
import { ProductPhotoModule } from 'src/modules/products/product-photo/product-photo.module';
import { CategoriesModule } from 'src/modules/store/categories/categories.module';
import { InventoryModule } from 'src/modules/store/inventory/inventory.module';
import {
  IStoreRepository,
  IStoreService,
} from 'src/common/contracts/products.contract';
import { ProductStoreService } from 'src/modules/products/implementations/product-store.service';
import { ProductStoreRepository } from 'src/modules/products/implementations/product-store.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ProductPhotoModule,
    InventoryModule,
    CategoriesModule,
  ],
  providers: [
    ProductRepository,
    ProductsService,
    ProductsMapper,
    {
      provide: IStoreService,
      useClass: ProductStoreService,
    },
    {
      provide: IStoreRepository,
      useClass: ProductStoreRepository,
    },
  ],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
