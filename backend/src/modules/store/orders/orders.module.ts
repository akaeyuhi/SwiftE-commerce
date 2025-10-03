import { Module } from '@nestjs/common';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { OrdersController } from 'src/modules/store/orders/orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItemModule } from 'src/modules/store/orders/order-item/order-item.module';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { InventoryModule } from 'src/modules/store/inventory/inventory.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderNotificationsListener } from 'src/modules/store/orders/listeners/order-notifications.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    EventEmitterModule.forRoot(),
    OrderItemModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrderNotificationsListener],
})
export class OrdersModule {}
