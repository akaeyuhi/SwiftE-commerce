import { forwardRef, Module } from '@nestjs/common';
import { StoreService } from 'src/modules/store/store.service';
import { StoreController } from 'src/modules/store/store.controller';
import { StoreRepository } from 'src/modules/store/store.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store/store.entity';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { PolicyModule } from 'src/modules/auth/modules/policy/policy.module';
import { CartModule } from 'src/modules/store/cart/cart.module';
import { InventoryModule } from 'src/modules/store/inventory/inventory.module';
import { NewsModule } from 'src/modules/store/news/news.module';
import { OrdersModule } from 'src/modules/store/orders/orders.module';
import { ReviewsModule } from 'src/modules/store/products/reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store]),
    forwardRef(() => PolicyModule),
    CartModule,
    InventoryModule,
    NewsModule,
    OrdersModule,
    forwardRef(() => ReviewsModule),
  ],
  controllers: [StoreController],
  providers: [StoreService, StoreRepository, StoreMapper],
  exports: [StoreService],
})
export class StoreModule {}
