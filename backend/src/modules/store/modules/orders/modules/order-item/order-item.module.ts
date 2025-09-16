import { Module } from '@nestjs/common';
import { OrderItemService } from 'src/modules/store/modules/orders/modules/order-item/order-item.service';
import { OrderItem } from 'src/entities/order-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem])],
  providers: [OrderItemService],
})
export class OrderItemModule {}
