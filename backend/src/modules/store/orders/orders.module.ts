import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { OrdersController } from 'src/modules/store/orders/orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItemModule } from 'src/modules/store/orders/order-item/order-item.module';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    OrderItemModule,
    AuthModule,
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
