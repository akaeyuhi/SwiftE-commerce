import { Module } from '@nestjs/common';
import { OrderItemService } from './order-item.service';
import { OrderItem } from 'src/entities/order-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem])],
  providers: [OrderItemService],
})
export class OrderItemModule {}
