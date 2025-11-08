import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { PaginationParams } from 'src/common/decorators/pagination.decorator';
import { Order } from 'src/entities/store/product/order.entity';

/**
 * OrdersRepository
 *
 * Small extension point for order-specific queries. BaseRepository already
 * provides common helpers.
 */
@Injectable()
export class OrdersRepository extends BaseRepository<Order> {
  constructor(dataSource: DataSource) {
    super(Order, dataSource.createEntityManager());
  }

  /**
   * Convenience: find orders for a user (with store and items).
   */
  async findByUser(
    userId: string,
    pagination?: PaginationParams
  ): Promise<[Order[], number]> {
    const { limit = 10, offset = 0 } = pagination || {};
    return this.findAndCount({
      where: { userId },
      relations: ['store', 'items', 'items.variant', 'items.product'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Convenience: find orders for a store (with items and user).
   */
  async findByStore(
    storeId: string,
    pagination?: PaginationParams
  ): Promise<[Order[], number]> {
    const { limit = 10, offset = 0 } = pagination || {};
    return this.findAndCount({
      where: { storeId },
      relations: ['user', 'items', 'items.variant', 'items.product'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Load order with full relations.
   */
  async findWithItems(orderId: string): Promise<Order | null> {
    return this.findOne({
      where: { id: orderId },
      relations: ['user', 'store', 'items', 'items.variant', 'items.product'],
    });
  }
}
