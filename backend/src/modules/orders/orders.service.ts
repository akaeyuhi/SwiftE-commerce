import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Order } from 'src/entities/order.entity';
import { OrdersRepository } from 'src/modules/orders/orders.repository';

@Injectable()
export class OrdersService extends BaseService<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  constructor(private readonly orderRepo: OrdersRepository) {
    super(orderRepo);
  }
}
