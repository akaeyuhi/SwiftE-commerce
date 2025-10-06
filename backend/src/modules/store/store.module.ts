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

@Module({
  imports: [
    TypeOrmModule.forFeature([Store]),
    StoreRoleModule,
    CartModule,
    CategoriesModule,
    InventoryModule,
    VariantsModule,
    NewsModule,
    OrdersModule,
  ],
  controllers: [StoreController],
  providers: [StoreService, StoreRepository, StoreMapper],
  exports: [StoreService],
})
export class StoreModule {}
