import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { UpdateOrderDto } from 'src/modules/store/orders/dto/update-order.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Order } from 'src/entities/store/product/order.entity';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { DataSource } from 'typeorm';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';

/**
 * OrdersService
 *
 * Responsible for creating orders (atomic create order + items transaction),
 * fetching orders by user/store, updating order status, and loading orders with items.
 */
@Injectable()
export class OrdersService extends BaseService<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly orderRepo: OrdersRepository,
    private readonly analyticsQueue: AnalyticsQueueService,
    private readonly itemRepo: OrderItemRepository,
    private readonly dataSource: DataSource
  ) {
    super(orderRepo);
  }

  /**
   * Create an order and its items inside a transaction.
   *
   * - Computes line totals and order total if not provided.
   * - Saves the order, then saves items referencing the order.
   * - Returns the saved order with items loaded.
   *
   * @param dto - CreateOrderDto
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Compute totals locally
    const computedTotal = dto.items.reduce((sum, it) => {
      const unit = Number(it.unitPrice) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + unit * qty;
    }, 0);

    const totalAmount = dto.totalAmount ?? computedTotal;

    // Transactional creation
    const created = await this.dataSource.transaction(async (manager) => {
      // create order record
      const orderRepoTx = manager.getRepository(Order);
      const orderToSave = orderRepoTx.create({
        user: { id: dto.userId },
        store: { id: dto.storeId },
        status: dto.status ?? OrderStatus.PENDING,
        totalAmount,
        shipping: dto.shipping,
        billing: dto.billing,
      });

      const savedOrder = (await orderRepoTx.save(
        orderToSave
      )) as unknown as Order;

      const itemRepoTx = manager.getRepository(this.itemRepo.metadata.target);
      for (const it of dto.items as CreateOrderItemDto[]) {
        const lineTotal = (Number(it.unitPrice) || 0) * (it.quantity || 0);
        const itemToSave = itemRepoTx.create({
          order: { id: savedOrder.id },
          product: it.productId ? { id: it.productId } : undefined,
          variant: it.variantId ? { id: it.variantId } : undefined,
          productName: it.productName,
          sku: it.sku,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          lineTotal,
        });
        await itemRepoTx.save(itemToSave);
      }

      if (Number(savedOrder.totalAmount) !== Number(totalAmount)) {
        savedOrder.totalAmount = totalAmount;
        await orderRepoTx.save(savedOrder);
      }

      return orderRepoTx.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'items.variant', 'items.product', 'store', 'user'],
      });
    });

    if (!created) {
      throw new BadRequestException('Failed to create order');
    }

    await this.recordEvent(created, AnalyticsEventType.PURCHASE);

    return created;
  }

  /**
   * Find orders for a user (includes items & store).
   * @param userId
   */
  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepo.findByUser(userId);
  }

  /**
   * Find orders for a store (includes items & user).
   * @param storeId
   */
  async findByStore(storeId: string): Promise<Order[]> {
    return this.orderRepo.findByStore(storeId);
  }

  /**
   * Load a single order with items & relations.
   * @param id
   */
  async getOrderWithItems(id: string): Promise<Order> {
    const order = await this.orderRepo.findWithItems(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Update status (e.g., 'shipped', 'cancelled', etc.).
   * @param id
   * @param status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    order.status = status;
    return await this.orderRepo.save(order);
  }

  /**
   * Checkout the order: set status to 'paid' and persist.
   *
   * Loads order with items and related product/variant so caller (controller)
   * can use that data for analytics or downstream work.
   *
   * @param orderId - uuid of the order
   * @returns updated Order with relations loaded
   */
  async paid(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    await this.updateStatus(order.id, OrderStatus.PAID);
    return this.recordEvent(order, AnalyticsEventType.PURCHASE);
  }

  /**
   * Convenience: fetch order with relations (items, variant.product, store, user)
   * used by controller or other services.
   */
  async findWithRelations(orderId: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { id: orderId },
      relations: [
        'items',
        'items.variant',
        'items.variant.product',
        'store',
        'user',
      ],
    });
  }

  private async recordEvent(
    order: Order,
    eventType: AnalyticsEventType
  ): Promise<void> {
    if ((order as any).status === OrderStatus.PAID) {
      try {
        const storeEvent: RecordEventDto = {
          storeId: order.store.id,
          userId: order.user.id,
          eventType,
          invokedOn: 'store',
          value: Number(order.totalAmount ?? 0),
          meta: { orderId: order.id },
        };
        await this.analyticsQueue.addEvent(storeEvent);
      } catch (err) {
        this.logger.warn(
          'Failed to enqueue purchase store-event: ' + (err as any)?.message
        );
      }

      try {
        for (const it of order.items ?? []) {
          const productId = it?.variant?.product?.id ?? undefined;
          const itemValue =
            Number((it as any).price ?? 0) * Number((it as any).quantity ?? 1);
          if (productId) {
            const productEvent: RecordEventDto = {
              storeId: order.store?.id,
              productId,
              userId: order.user?.id,
              eventType,
              invokedOn: 'product',
              value: itemValue,
              meta: {
                orderId: order.id,
                itemId: it.id,
                quantity: (it as any).quantity,
              },
            };
            await this.analyticsQueue.addEvent(productEvent);
          }
        }
      } catch (err) {
        this.logger.warn(
          'Failed to enqueue per-item purchase events: ' + (err as any)?.message
        );
      }
    }
  }
}
