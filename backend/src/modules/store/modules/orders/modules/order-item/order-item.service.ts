import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { OrderItemRepository } from 'src/modules/store/modules/orders/modules/order-item/order-item.repository';
import { CreateOrderItemDto } from 'src/modules/store/modules/orders/modules/order-item/dto/create-order-item.dto';

/**
 * OrderItemService
 *
 * Convenience helpers for order items. The heavy-lifting creation of order + items
 * is done in OrdersService (which manages transactions). These helpers are useful
 * when you want to manage items individually.
 */
@Injectable()
export class OrderItemService extends BaseService<OrderItem> {
  constructor(private readonly itemRepo: OrderItemRepository) {
    super(itemRepo);
  }

  /**
   * Create and persist a single OrderItem row attached to the given order.
   *
   * @param orderId - id of the order
   * @param dto - CreateOrderItemDto describing the line
   */
  async createForOrder(
    orderId: string,
    dto: CreateOrderItemDto
  ): Promise<OrderItem> {
    const lineTotal = (Number(dto.unitPrice) || 0) * (dto.quantity || 0);
    const partial = {
      order: { id: orderId },
      product: dto.productId ? { id: dto.productId } : undefined,
      variant: dto.variantId ? { id: dto.variantId } : undefined,
      productName: dto.productName,
      sku: dto.sku,
      unitPrice: dto.unitPrice,
      quantity: dto.quantity,
      lineTotal,
    };
    return this.repository.createEntity(partial);
  }

  /**
   * Convenience: create multiple items for an order
   *
   * @param orderId
   * @param items
   */
  async createManyForOrder(
    orderId: string,
    items: CreateOrderItemDto[]
  ): Promise<OrderItem[]> {
    const created: OrderItem[] = [];
    for (const it of items) {
      const saved = await this.createForOrder(orderId, it);
      created.push(saved);
    }
    return created;
  }

  /**
   * Get items for an order id.
   */
  async getByOrder(orderId: string): Promise<OrderItem[]> {
    return this.itemRepo.findByOrder(orderId);
  }
}
