import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/entities/store/product/product.entity';
import { ProductRepository } from 'src/modules/products/products.repository';
import { ProductsService } from 'src/modules/products/products.service';
import { ProductsController } from 'src/modules/products/products.controller';
import { ProductsMapper } from 'src/modules/products/products.mapper';
import { ProductPhotoModule } from 'src/modules/products/product-photo/product-photo.module';
import { VariantsModule } from 'src/modules/products/variants/variants.module';
import { StoreModule } from 'src/modules/store/store.module';
import { CategoriesModule } from 'src/modules/store/categories/categories.module';
import { InventoryModule } from 'src/modules/store/inventory/inventory.module';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ProductPhotoModule,
    StoreModule,
    PolicyModule,
    InventoryModule,
    CategoriesModule,
    VariantsModule,
    forwardRef(() => AnalyticsModule),
  ],
  providers: [ProductRepository, ProductsService, ProductsMapper],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
