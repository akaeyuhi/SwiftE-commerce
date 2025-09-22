import { Module } from '@nestjs/common';
import { OrderItemService } from 'src/modules/store/modules/orders/modules/order-item/order-item.service';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemRepository } from 'src/modules/store/modules/orders/modules/order-item/order-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem])],
  providers: [OrderItemRepository, OrderItemService],
})
export class OrderItemModule {}
