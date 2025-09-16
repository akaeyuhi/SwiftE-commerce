import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateOrderDto } from 'src/modules/store/modules/orders/dto/create-order.dto';
import { UpdateOrderDto } from 'src/modules/store/modules/orders/dto/update-order.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Order } from 'src/entities/order.entity';
import { OrdersRepository } from 'src/modules/store/modules/orders/orders.repository';
import { OrderItemRepository } from 'src/modules/store/modules/orders/modules/order-item/order-item.repository';
import { OrderItemService } from 'src/modules/store/modules/orders/modules/order-item/order-item.service';
import { DataSource } from 'typeorm';
import { CreateOrderItemDto } from 'src/modules/store/modules/orders/modules/order-item/dto/create-order-item.dto';

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
  constructor(
    private readonly orderRepo: OrdersRepository,
    private readonly itemRepo: OrderItemRepository,
    private readonly itemService: OrderItemService,
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
        status: dto.status ?? 'pending',
        totalAmount,
        shipping: dto.shipping,
        billing: dto.billing,
      });

      const savedOrder = await orderRepoTx.save(orderToSave);

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
  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    order.status = status;
    const saved = await this.orderRepo.save(order);
    return saved;
  }
}
