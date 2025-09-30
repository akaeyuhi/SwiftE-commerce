import { forwardRef, Module } from '@nestjs/common';
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
import { STORE_SERVICE } from 'src/common/contracts/policy.contract';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store]),
    AuthModule,
    CartModule,
    CategoriesModule,
    InventoryModule,
    NewsModule,
    OrdersModule,
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [StoreController],
  providers: [
    StoreService,
    { provide: STORE_SERVICE, useExisting: StoreService },
    StoreRepository,
    StoreMapper,
  ],
  exports: [StoreService, STORE_SERVICE],
})
export class StoreModule {}
