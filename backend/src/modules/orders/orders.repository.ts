import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { Order } from 'src/entities/order.entity';

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
  async findByUser(userId: string): Promise<Order[]> {
    return this.find({
      where: { user: { id: userId } as any } as any,
      relations: ['store', 'items', 'items.variant', 'items.product'],
      order: { createdAt: 'DESC' },
    } as any);
  }

  /**
   * Convenience: find orders for a store (with items and user).
   */
  async findByStore(storeId: string): Promise<Order[]> {
    return this.find({
      where: { store: { id: storeId } as any } as any,
      relations: ['user', 'items', 'items.variant', 'items.product'],
      order: { createdAt: 'DESC' },
    } as any);
  }

  /**
   * Load order with full relations.
   */
  async findWithItems(orderId: string): Promise<Order | null> {
    return this.findOne({
      where: { id: orderId } as any,
      relations: ['user', 'store', 'items', 'items.variant', 'items.product'],
    } as any);
  }
}
