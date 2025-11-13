import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/entities/store/product/order.entity';
import { Repository } from 'typeorm';
import { IOrderService } from 'src/common/contracts/admin.contract';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminOrdersService implements IOrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>
  ) {}

  async count(searchParams?: any) {
    return this.orderRepository.count(searchParams);
  }

  async getTotalRevenue(): Promise<number> {
    const { totalRevenue } = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne();
    return totalRevenue;
  }
}
