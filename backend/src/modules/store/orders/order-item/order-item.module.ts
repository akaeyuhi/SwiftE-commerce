import { Module } from '@nestjs/common';
import { OrderItemService } from 'src/modules/store/orders/order-item/order-item.service';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem])],
  providers: [OrderItemRepository, OrderItemService],
  exports: [OrderItemRepository, OrderItemService],
})
export class OrderItemModule {}
