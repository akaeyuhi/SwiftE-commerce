import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { OrderItem } from 'src/entities/order-item.entity';

@Injectable()
export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor(dataSource: DataSource) {
    super(OrderItem, dataSource.createEntityManager());
  }
}
