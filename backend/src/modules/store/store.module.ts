import { Module } from '@nestjs/common';
import { StoreService } from 'src/modules/store/store.service';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreRepository } from 'src/modules/store/store.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store/store.entity';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { CartModule } from 'src/modules/store/cart/cart.module';
import { InventoryModule } from 'src/modules/store/inventory/inventory.module';
import { NewsModule } from 'src/modules/store/news/news.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { CategoriesModule } from 'src/modules/store/categories/categories.module';
import { VariantsModule } from 'src/modules/store/variants/variants.module';
import { StoreRoleModule } from 'src/modules/store/store-role/store-role.module';
import { StoreFileService } from 'src/modules/store/store-file/store-file.service';
import { VariantsService } from 'src/modules/store/variants/variants.service';
import { ConfigModule } from '@nestjs/config';
import { VariantsRepository } from 'src/modules/store/variants/variants.repository';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Order } from 'src/entities/store/product/order.entity';
import { Category } from 'src/entities/store/product/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, Order, ProductVariant, Product, Category]),
    StoreRoleModule,
    ConfigModule,
    CartModule,
    CategoriesModule,
    InventoryModule,
    VariantsModule,
    NewsModule,
    OrdersModule,
  ],
  controllers: [StoreController],
  providers: [
    StoreService,
    StoreRepository,
    StoreMapper,
    StoreFileService,
    VariantsRepository,
    VariantsService,
  ],
  exports: [StoreService, VariantsService],
})
export class StoreModule {}
