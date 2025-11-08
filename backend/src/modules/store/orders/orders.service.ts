import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { UpdateOrderDto } from 'src/modules/store/orders/dto/update-order.dto';

import { PaginationParams } from 'src/common/decorators/pagination.decorator';
import { Order } from 'src/entities/store/product/order.entity';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { DataSource } from 'typeorm';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrderAddressInfo,
  OrderCreatedEvent,
  OrderShippingInfo,
  OrderStatusChangeEvent,
} from 'src/common/events/orders/order-status-change.event';
import { OrderInfo } from 'src/common/embeddables/order-info.embeddable';
import { UpdateShippingInfoDto } from 'src/modules/store/orders/dto/update-shipping-info.dto';
import { domainEventFactory } from 'src/common/events/helper';
import { BaseService } from 'src/common/abstracts/base.service';

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
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super(orderRepo);
  }

  /**
   * Create an order and its items inside a transaction.
   *
   * Process:
   * 1. Validate inventory availability for all items
   * 2. Create order record
   * 3. Create order items
   * 4. Reserve/deduct inventory for each item
   * 5. Compute totals
   * 6. Record analytics events
   *
   * If any step fails, entire transaction is rolled back.
   *
   * @param dto - CreateOrderDto with items array
   * @throws BadRequestException if insufficient stock or validation fails
   * @throws NotFoundException if variant not found
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const checkStore = await this.dataSource
      .getRepository('Store')
      .findOne({ where: { id: dto.storeId } });

    if (!checkStore) {
      throw new NotFoundException(`Store with id ${dto.storeId} doesn't exist`);
    }

    if (!dto.shipping) {
      throw new BadRequestException(`Shipping info is missing`);
    }

    await this.validateInventoryAvailability(dto.items);

    const computedTotal = dto.items.reduce((sum, it) => {
      const unit = Number(it.unitPrice) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + unit * qty;
    }, 0);

    const totalAmount = dto.totalAmount ?? computedTotal;

    const created = await this.dataSource.transaction(async (manager) => {
      const orderRepoTx = manager.getRepository(Order);
      const orderToSave = orderRepoTx.create({
        userId: dto.userId,
        storeId: dto.storeId,
        status: dto.status ?? OrderStatus.PENDING,
        totalAmount,
        shipping: dto.shipping,
        billing: dto.billing ?? dto.shipping,
      });

      const savedOrder = await orderRepoTx.save(orderToSave);

      const itemRepoTx = manager.getRepository(this.itemRepo.metadata.target);
      const inventoryAdjustments: Array<{
        variantId: string;
        quantity: number;
        sku: string;
      }> = [];

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

        if (it.variantId) {
          inventoryAdjustments.push({
            variantId: it.variantId,
            quantity: it.quantity,
            sku: it.sku || 'unknown',
          });
        }
      }

      if (Number(savedOrder.totalAmount) !== Number(totalAmount)) {
        savedOrder.totalAmount = totalAmount;
        await orderRepoTx.save(savedOrder);
      }

      for (const adj of inventoryAdjustments) {
        try {
          await this.inventoryService.adjustInventory(
            adj.variantId,
            -adj.quantity // Negative = decrease
          );

          this.logger.log(
            `Deducted ${adj.quantity} units from variant ${adj.sku} for order ${savedOrder.id}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to deduct inventory for variant ${adj.variantId} (SKU: ${adj.sku})`,
            error.stack
          );
          throw new BadRequestException(
            `Insufficient stock for product ${adj.sku}. Order creation failed.`
          );
        }
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

    await this.emitOrderCreatedEvent(created);

    this.logger.log(
      `Order ${created.id} created successfully with ${created.items.length} items. ` +
        `Total: ${created.totalAmount}`
    );

    return created;
  }
  /**
   * Validate inventory availability for all order items before creating order.
   *
   * Performs a pre-flight check to avoid starting transactions that will fail.
   * This is a soft validation - actual inventory is locked during transaction.
   *
   * @param items - array of order items to validate
   * @throws BadRequestException if insufficient stock
   */
  private async validateInventoryAvailability(
    items: CreateOrderItemDto[]
  ): Promise<void> {
    const validationErrors: string[] = [];

    for (const item of items) {
      if (!item.variantId) {
        continue;
      }

      try {
        const inventory = await this.inventoryService.findInventoryByVariantId(
          item.variantId
        );

        if (!inventory) {
          validationErrors.push(
            `Product ${item.productName} (SKU: ${item.sku}) is not available`
          );
          continue;
        }

        if (inventory.quantity < item.quantity) {
          validationErrors.push(
            `Insufficient stock for ${item.productName} (SKU: ${item.sku}). ` +
              `Available: ${inventory.quantity}, Requested: ${item.quantity}`
          );
        }
      } catch (error) {
        this.logger.error(
          `Error validating inventory for variant ${item.variantId}`,
          error.stack
        );
        validationErrors.push(`Unable to verify stock for ${item.productName}`);
      }
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Order validation failed',
        errors: validationErrors,
      });
    }
  }

  async getTotalRevenue(): Promise<number> {
    const { totalRevenue } = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne();
    return totalRevenue;
  }

  /**
   * Find orders for a user (includes items & store).
   * @param userId
   */
  async findByUser(
    userId: string,
    pagination?: PaginationParams
  ): Promise<[Order[], number]> {
    return this.orderRepo.findByUser(userId, pagination);
  }

  /**
   * Find orders for a store (includes items & user).
   * @param storeId
   */
  async findByStore(
    storeId: string,
    pagination?: PaginationParams
  ): Promise<[Order[], number]> {
    return this.orderRepo.findByStore(storeId, pagination);
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

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.getOrderWithItems(id);
    if (!order) throw new NotFoundException('Order not found');

    const previousStatus = order.status;

    // Handle inventory restoration for cancellations and returns
    if (this.shouldRestoreInventory(previousStatus, status)) {
      await this.restoreInventoryForOrder(order);
    }

    // Update status
    order.status = status;
    const updated = await this.orderRepo.save(order);

    this.logger.log(
      `Order ${id} status updated: ${previousStatus} → ${status}`
    );

    if (previousStatus !== status) {
      await this.emitOrderStatusChangeEvent(updated, previousStatus, status);
    }

    return updated;
  }

  async markAsDelivered(orderId: string): Promise<Order> {
    const order = await this.getOrderWithItems(orderId);

    order.shipping.deliveredAt = new Date();
    await this.orderRepo.save(order);

    // Update status (this triggers the notification)
    const updated = await this.updateStatus(orderId, OrderStatus.DELIVERED);

    this.logger.log(`Order ${orderId} marked as delivered`);

    return updated;
  }

  async updateShippingInfo(
    orderId: string,
    dto: UpdateShippingInfoDto
  ): Promise<Order> {
    const order = await this.getOrderWithItems(orderId);

    // Update shipping info in the embedded OrderInfo
    if (dto.trackingNumber) {
      order.shipping.trackingNumber = dto.trackingNumber;
    }
    if (dto.estimatedDeliveryDate) {
      order.shipping.estimatedDeliveryDate = new Date(
        dto.estimatedDeliveryDate
      );
    }
    if (dto.shippingMethod) {
      order.shipping.shippingMethod = dto.shippingMethod;
    }
    if (dto.deliveryInstructions) {
      order.shipping.deliveryInstructions = dto.deliveryInstructions;
    }

    // Set shipped timestamp
    order.shipping.shippedAt = new Date();

    // Save the order (this persists the embedded OrderInfo)
    const updated = await this.orderRepo.save(order);

    // Update status to SHIPPED if not already (this triggers the notification)
    if (order.status !== OrderStatus.SHIPPED) {
      await this.updateStatus(orderId, OrderStatus.SHIPPED);
    }

    this.logger.log(
      `Shipping info updated for order ${orderId}. Tracking: ${dto.trackingNumber || 'N/A'}`
    );

    return updated;
  }

  /**
   * Emit order created event.
   */
  private async emitOrderCreatedEvent(order: Order): Promise<void> {
    try {
      const event = new OrderCreatedEvent(
        order.id,
        this.generateOrderNumber(order.id),
        order.user.id,
        order.user.email,
        this.getUserDisplayName(order.user),
        order.store.id,
        order.store.name,
        Number(order.totalAmount),
        order.items.map((item) => ({
          productName: item.productName,
          sku: item.sku || 'N/A',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        this.generateOrderUrl(order.store.id, order.id),
        this.mapOrderInfoToShippingInfo(order.shipping),
        order.billing
          ? this.mapOrderInfoToAddressInfo(order.billing)
          : undefined
      );

      const domainEvent = domainEventFactory<OrderCreatedEvent>(
        'order.created',
        order.id,
        event
      );

      this.eventEmitter.emit('order.created', domainEvent);

      this.logger.debug(`Emitted order.created event for order ${order.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit order.created event for order ${order.id}`,
        error.stack
      );
    }
  }

  /**
   * Emit order status change event.
   */
  private async emitOrderStatusChangeEvent(
    order: Order,
    previousStatus: OrderStatus,
    newStatus: OrderStatus
  ): Promise<void> {
    try {
      const event = new OrderStatusChangeEvent(
        order.id,
        this.generateOrderNumber(order.id),
        previousStatus,
        newStatus,
        order.user.id,
        order.user.email,
        this.getUserDisplayName(order.user),
        order.store.id,
        order.store.name,
        Number(order.totalAmount),
        order.items.map((item) => ({
          productName: item.productName,
          sku: item.sku || 'N/A',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        order.shipping
          ? this.mapOrderInfoToShippingInfo(order.shipping)
          : undefined,
        order.billing
          ? this.mapOrderInfoToAddressInfo(order.billing)
          : undefined
      );

      const domainEvent = domainEventFactory<OrderStatusChangeEvent>(
        'order.status-changed',
        order.id,
        event
      );

      this.eventEmitter.emit('order.status-changed', domainEvent);

      this.logger.debug(
        `Emitted order.status-changed event for order ${order.id}: ${previousStatus} → ${newStatus}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit order.status-changed event for order ${order.id}`,
        error.stack
      );
    }
  }

  /**
   * Map OrderInfo embeddable to OrderShippingInfo.
   */
  private mapOrderInfoToShippingInfo(orderInfo: OrderInfo): OrderShippingInfo {
    return {
      firstName: orderInfo.firstName,
      lastName: orderInfo.lastName,
      company: orderInfo.company,
      addressLine1: orderInfo.addressLine1,
      addressLine2: orderInfo.addressLine2,
      city: orderInfo.city,
      state: orderInfo.state,
      postalCode: orderInfo.postalCode,
      country: orderInfo.country,
      phone: orderInfo.phone,
      email: orderInfo.email,
      deliveryInstructions: orderInfo.deliveryInstructions,
      shippingMethod: orderInfo.shippingMethod,
      trackingNumber: orderInfo.trackingNumber,
      estimatedDeliveryDate: orderInfo.estimatedDeliveryDate,
      shippedAt: orderInfo.shippedAt,
      deliveredAt: orderInfo.deliveredAt,
    };
  }

  /**
   * Map OrderInfo embeddable to OrderAddressInfo (for billing).
   */
  private mapOrderInfoToAddressInfo(orderInfo: OrderInfo): OrderAddressInfo {
    return {
      firstName: orderInfo.firstName,
      lastName: orderInfo.lastName,
      company: orderInfo.company,
      addressLine1: orderInfo.addressLine1,
      addressLine2: orderInfo.addressLine2,
      city: orderInfo.city,
      state: orderInfo.state,
      postalCode: orderInfo.postalCode,
      country: orderInfo.country,
      phone: orderInfo.phone,
      email: orderInfo.email,
      deliveryInstructions: orderInfo.deliveryInstructions,
    };
  }

  /**
   * Generate order number from order ID.
   */
  private generateOrderNumber(orderId: string): string {
    return `ORD-${orderId.substring(0, 8).toUpperCase()}`;
  }

  /**
   * Generate order view URL for customer.
   */
  private generateOrderUrl(storeId: string, orderId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
    return `${baseUrl}/stores/${storeId}/orders/${orderId}`;
  }

  /**
   * Get user display name with fallback.
   */
  private getUserDisplayName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Customer';
  }

  /**
   * Determine if inventory should be restored based on status transition.
   */
  private shouldRestoreInventory(
    previousStatus: OrderStatus,
    newStatus: OrderStatus
  ): boolean {
    const restoreTriggers = [
      { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED },
      { from: OrderStatus.PAID, to: OrderStatus.CANCELLED },
      { from: OrderStatus.PROCESSING, to: OrderStatus.CANCELLED },
      { from: OrderStatus.DELIVERED, to: OrderStatus.RETURNED },
    ];

    return restoreTriggers.some(
      (trigger) => trigger.from === previousStatus && trigger.to === newStatus
    );
  }

  /**
   * Restore inventory for cancelled or returned orders.
   *
   * Adds quantities back to stock for each order item.
   * This may trigger restocked notifications if implemented.
   *
   * @param order - order to restore inventory for
   */
  private async restoreInventoryForOrder(order: Order): Promise<void> {
    const restorationPromises = order.items
      .filter((item) => item.variant?.id) // Only process items with variants
      .map(async (item) => {
        try {
          await this.inventoryService.adjustInventory(
            item.variant!.id,
            item.quantity // Positive = increase
          );

          this.logger.log(
            `Restored ${item.quantity} units to variant ${item.sku} ` +
              `from order ${order.id} (status: ${order.status})`
          );
        } catch (error) {
          this.logger.error(
            `Failed to restore inventory for variant ${item.variant!.id} ` +
              `(SKU: ${item.sku}) from order ${order.id}`,
            error.stack
          );
          // Don't throw - log error and continue with other items
        }
      });

    await Promise.allSettled(restorationPromises);

    this.logger.log(`Inventory restoration completed for order ${order.id}`);
  }

  /**
   * Mark order as paid.
   *
   * Note: Inventory was already deducted during order creation.
   * This method just updates the status and records analytics.
   *
   * @param orderId - order id
   */
  async paid(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    await this.updateStatus(order.id, OrderStatus.PAID);
    await this.recordEvent(order, AnalyticsEventType.PURCHASE);

    this.logger.log(`Order ${orderId} marked as paid`);
  }

  /**
   * Cancel an order and restore inventory.
   *
   * @param orderId - order id
   * @param reason - cancellation reason (optional)
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const order = await this.getOrderWithItems(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Prevent cancellation of shipped/delivered orders
    if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status. Please process as return.`
      );
    }

    // Update status (this will trigger inventory restoration)
    const cancelled = await this.updateStatus(orderId, OrderStatus.CANCELLED);

    this.logger.log(
      `Order ${orderId} cancelled. Reason: ${reason || 'Not specified'}`
    );

    return cancelled;
  }

  /**
   * Process order return and restore inventory.
   *
   * @param orderId - order id
   * @param returnedItems - array of item IDs being returned (optional - defaults to all)
   */
  async returnOrder(orderId: string, returnedItems?: string[]): Promise<Order> {
    const order = await this.getOrderWithItems(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    // If specific items are being returned, restore only those
    if (returnedItems && returnedItems.length > 0) {
      const itemsToReturn = order.items.filter((item) =>
        returnedItems.includes(item.id)
      );

      for (const item of itemsToReturn) {
        if (item.variant?.id) {
          await this.inventoryService.adjustInventory(
            item.variant.id,
            item.quantity
          );
        }
      }

      this.logger.log(
        `Partial return processed for order ${orderId}. ` +
          `Items returned: ${returnedItems.length}`
      );

      // You might want to add a "partially_returned" status
      return order;
    }

    // Full return - update status (triggers full inventory restoration)
    const returned = await this.updateStatus(orderId, OrderStatus.RETURNED);

    this.logger.log(`Full return processed for order ${orderId}`);

    return returned;
  }

  /**
   * Get inventory impact summary for an order.
   *
   * Useful for order preview and admin dashboards.
   */
  async getOrderInventoryImpact(orderId: string): Promise<{
    totalItems: number;
    totalUnits: number;
    itemsWithInventory: number;
    estimatedValue: number;
  }> {
    const order = await this.getOrderWithItems(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let totalUnits = 0;
    let itemsWithInventory = 0;
    let estimatedValue = 0;

    for (const item of order.items) {
      totalUnits += item.quantity;
      estimatedValue += Number(item.lineTotal);

      if (item.variant?.id) {
        itemsWithInventory++;
      }
    }

    return {
      totalItems: order.items.length,
      totalUnits,
      itemsWithInventory,
      estimatedValue,
    };
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
