import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductRepository } from 'src/modules/products/repositories/products.repository';
import { ProductsService } from 'src/modules/products/services/products.service';
import { ProductsController } from 'src/modules/products/controllers/products.controller';
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
import { ProductQueryRepository } from 'src/modules/products/repositories/product-query.repository';
import { ProductSearchRepository } from 'src/modules/products/repositories/product-search.repository';
import { ProductRankingRepository } from 'src/modules/products/repositories/product-ranking.repository';
import { ProductsRankingController } from 'src/modules/products/controllers/products-ranking.controller';
import { ProductsRankingService } from 'src/modules/products/services/product-ranking.service';
import { Store } from 'src/entities/store/store.entity';
import { ReviewsModule } from 'src/modules/products/reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Store]),
    ProductPhotoModule,
    InventoryModule,
    CategoriesModule,
    ReviewsModule,
  ],
  providers: [
    ProductRepository,
    ProductQueryRepository,
    ProductSearchRepository,
    ProductRankingRepository,
    ProductsService,
    ProductsRankingService,
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
  controllers: [ProductsRankingController, ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
