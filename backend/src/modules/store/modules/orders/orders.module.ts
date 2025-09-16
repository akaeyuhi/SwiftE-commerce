import { Module } from '@nestjs/common';
import { OrdersService } from 'src/modules/store/modules/orders/orders.service';
import { OrdersController } from 'src/modules/store/modules/orders/orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/entities/order.entity';
import { OrderItemModule } from 'src/modules/store/modules/orders/modules/order-item/order-item.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), OrderItemModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
