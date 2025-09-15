import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { OrderItem } from 'src/entities/order-item.entity';
import { OrderItemRepository } from 'src/modules/orders/order-item/order-item.repository';

@Injectable()
export class OrderItemService extends BaseService<OrderItem> {
  constructor(private readonly itemRepo: OrderItemRepository) {
    super(itemRepo);
  }
}
