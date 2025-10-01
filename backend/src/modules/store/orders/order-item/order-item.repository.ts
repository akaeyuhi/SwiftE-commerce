import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { OrderItem } from 'src/entities/store/product/order-item.entity';

/**
 * OrderItemRepository
 *
 * Provides a few convenient methods used by services (e.g., list by order).
 */
@Injectable()
export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor(dataSource: DataSource) {
    super(OrderItem, dataSource.createEntityManager());
  }

  /**
   * Find items for a given order id (with optional relations).
   *
   * @param orderId - uuid of the order
   */
  async findByOrder(orderId: string): Promise<OrderItem[]> {
    return this.find({
      where: { order: { id: orderId } },
      relations: ['product', 'variant'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find all items that reference a particular variant (useful for inventory adjustments).
   *
   * @param variantId - uuid of product variant
   */
  async findByVariant(variantId: string): Promise<OrderItem[]> {
    return this.find({
      where: { variant: { id: variantId } },
      relations: ['order'],
    });
  }
}
