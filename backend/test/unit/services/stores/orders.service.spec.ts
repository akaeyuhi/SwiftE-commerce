import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { OrdersRepository } from 'src/modules/store/orders/orders.repository';
import { OrderItemRepository } from 'src/modules/store/orders/order-item/order-item.repository';
import { InventoryService } from 'src/modules/store/inventory/inventory.service';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { CreateOrderItemDto } from 'src/modules/store/orders/order-item/dto/create-order-item.dto';
import { UpdateShippingInfoDto } from 'src/modules/store/orders/dto/update-shipping-info.dto';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import {
  createMock,
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/helpers';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import {
  OrderCreatedEvent,
  OrderStatusChangeEvent,
} from 'src/common/events/orders/order-status-change.event';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Product } from 'src/entities/store/product/product.entity';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { OrderInfo } from 'src/common/embeddables/order-info.embeddable';
import { AnalyticsEventType } from 'src/modules/infrastructure/queues/analytics-queue/types/analytics-queue.types';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: Partial<MockedMethods<OrdersRepository>>;
  let itemRepo: Partial<MockedMethods<OrderItemRepository>>;
  let inventoryService: Partial<MockedMethods<InventoryService>>;
  let analyticsQueue: Partial<MockedMethods<AnalyticsQueueService>>;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let manager: Partial<MockedMethods<EntityManager>>;
  let txOrderRepo: any;
  let txItemRepo: any;

  const mockUser: User = {
    id: 'u1',
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
  } as Store;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    store: mockStore,
  } as Product;

  const mockVariant: ProductVariant = {
    id: 'v1',
    sku: 'TEST-SKU-001',
    product: mockProduct,
    price: 10.0,
  } as ProductVariant;

  const mockInventory: Inventory = {
    id: 'inv1',
    variant: mockVariant,
    quantity: 100,
  } as Inventory;

  const mockOrderInfo: OrderInfo = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Test City',
    state: 'TS',
    postalCode: '12345',
    country: 'US',
    phone: '555-0100',
    email: 'customer@example.com',
  } as OrderInfo;

  const mockOrderItem: OrderItem = {
    id: 'oi1',
    product: mockProduct,
    variant: mockVariant,
    productName: 'Test Product',
    sku: 'TEST-SKU-001',
    quantity: 2,
    unitPrice: 10.0,
    lineTotal: 20.0,
  } as OrderItem;

  const mockOrder: Order = {
    id: 'o1',
    user: mockUser,
    store: mockStore,
    status: OrderStatus.PENDING,
    totalAmount: 20.0,
    items: [mockOrderItem],
    shipping: mockOrderInfo,
    billing: mockOrderInfo,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Order;

  const createOrderDto: CreateOrderDto = {
    userId: 'u1',
    storeId: 's1',
    items: [
      {
        productId: 'p1',
        variantId: 'v1',
        quantity: 2,
        unitPrice: 10.0,
        productName: 'Test Product',
        sku: 'TEST-SKU-001',
      },
    ] as CreateOrderItemDto[],
    shipping: mockOrderInfo,
    billing: mockOrderInfo,
  };

  beforeEach(async () => {
    orderRepo = createRepositoryMock<OrdersRepository>([
      'findById',
      'find',
      'findOne',
      'save',
      'findByUser',
      'findByStore',
      'findWithItems',
    ]);

    itemRepo = createRepositoryMock<OrderItemRepository>([]);
    (itemRepo as any).metadata = { target: {} };

    inventoryService = createServiceMock<InventoryService>([
      'findInventoryByVariantId',
      'adjustInventory',
    ]);

    analyticsQueue = createMock<AnalyticsQueueService>(['addEvent']);

    eventEmitter = createMock<EventEmitter2>(['emit']);

    txOrderRepo = createMock<Repository<Order>>(['create', 'save', 'findOne']);
    txItemRepo = createMock<Repository<OrderItem>>(['create', 'save']);

    manager = createMock<EntityManager>(['getRepository']);
    dataSource = createMock<DataSource>(['transaction']);

    (dataSource.transaction as jest.Mock).mockImplementation(
      async (runInTx) => {
        manager
          .getRepository!.mockReturnValueOnce(txOrderRepo)
          .mockReturnValueOnce(txItemRepo);
        return await (runInTx as (em: EntityManager) => Promise<any>)(
          manager as any
        );
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: orderRepo },
        { provide: OrderItemRepository, useValue: itemRepo },
        { provide: InventoryService, useValue: inventoryService },
        { provide: AnalyticsQueueService, useValue: analyticsQueue },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.spyOn(service as any, 'recordEvent').mockResolvedValue(undefined);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(OrdersService);
      expect(typeof service.create).toBe('function');
    });
  });

  describe('createOrder', () => {
    beforeEach(() => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      txOrderRepo.create.mockReturnValue(mockOrder);
      txOrderRepo.save.mockResolvedValue(mockOrder);
      txOrderRepo.findOne.mockResolvedValue(mockOrder);
      txItemRepo.create.mockReturnValue(mockOrderItem);
      txItemRepo.save.mockResolvedValue(mockOrderItem);
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      eventEmitter.emit!.mockReturnValue(true);
      analyticsQueue.addEvent!.mockResolvedValue(undefined as any);
    });

    it('should throw BadRequestException when no items', async () => {
      await expect(
        service.createOrder({ userId: 'u1', storeId: 's1', items: [] } as any)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createOrder({ userId: 'u1', storeId: 's1', items: [] } as any)
      ).rejects.toThrow('Order must contain at least one item');
    });

    it('should validate inventory availability before creating order', async () => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );

      await service.createOrder(createOrderDto);

      expect(inventoryService.findInventoryByVariantId).toHaveBeenCalledWith(
        'v1'
      );
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const lowStockInventory = { ...mockInventory, quantity: 1 };
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        lowStockInventory
      );

      await expect(service.createOrder(createOrderDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create order and items in transaction', async () => {
      const result = await service.createOrder(createOrderDto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(txOrderRepo.create).toHaveBeenCalled();
      expect(txOrderRepo.save).toHaveBeenCalled();
      expect(txItemRepo.create).toHaveBeenCalled();
      expect(txItemRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockOrder);
    });

    it('should adjust inventory for each order item', async () => {
      await service.createOrder(createOrderDto);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', -2);
    });

    it('should emit order.created event', async () => {
      await service.createOrder(createOrderDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.created',
        expect.any(OrderCreatedEvent)
      );
    });

    it('should record analytics event', async () => {
      await service.createOrder(createOrderDto);

      expect(service['recordEvent']).toHaveBeenCalledWith(
        expect.any(Object),
        AnalyticsEventType.PURCHASE
      );
    });

    it('should calculate total amount from items', async () => {
      const dtoWithoutTotal = { ...createOrderDto };
      delete (dtoWithoutTotal as any).totalAmount;

      await service.createOrder(dtoWithoutTotal);

      expect(txOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 20, // 2 * 10
        })
      );
    });

    it('should rollback on inventory adjustment failure', async () => {
      inventoryService.adjustInventory!.mockRejectedValue(
        new Error('Insufficient stock')
      );

      await expect(service.createOrder(createOrderDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle multiple items with different variants', async () => {
      const multiItemDto = {
        ...createOrderDto,
        items: [
          {
            productId: 'p1',
            variantId: 'v1',
            quantity: 2,
            unitPrice: 10.0,
            productName: 'Product 1',
            sku: 'SKU-001',
          },
          {
            productId: 'p2',
            variantId: 'v2',
            quantity: 1,
            unitPrice: 15.0,
            productName: 'Product 2',
            sku: 'SKU-002',
          },
        ] as CreateOrderItemDto[],
      };

      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );

      await service.createOrder(multiItemDto);

      expect(inventoryService.adjustInventory).toHaveBeenCalledTimes(2);
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', -2);
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v2', -1);
    });
  });

  describe('findByUser', () => {
    it('should delegate to orderRepo.findByUser', async () => {
      orderRepo.findByUser!.mockResolvedValue([mockOrder]);

      const result = await service.findByUser('u1');

      expect(orderRepo.findByUser).toHaveBeenCalledWith('u1');
      expect(result).toEqual([mockOrder]);
    });

    it('should return empty array when no orders found', async () => {
      orderRepo.findByUser!.mockResolvedValue([]);

      const result = await service.findByUser('u1');

      expect(result).toEqual([]);
    });
  });

  describe('findByStore', () => {
    it('should delegate to orderRepo.findByStore', async () => {
      orderRepo.findByStore!.mockResolvedValue([mockOrder]);

      const result = await service.findByStore('s1');

      expect(orderRepo.findByStore).toHaveBeenCalledWith('s1');
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('getOrderWithItems', () => {
    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findWithItems!.mockResolvedValue(null);

      await expect(service.getOrderWithItems('nonexistent')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getOrderWithItems('nonexistent')).rejects.toThrow(
        'Order not found'
      );
    });

    it('should return order with items when found', async () => {
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);

      const result = await service.getOrderWithItems('o1');

      expect(result).toEqual(mockOrder);
      expect(orderRepo.findWithItems).toHaveBeenCalledWith('o1');
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);
      orderRepo.save!.mockResolvedValue(mockOrder);
      eventEmitter.emit!.mockReturnValue(true);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findWithItems!.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', OrderStatus.SHIPPED)
      ).rejects.toThrow(NotFoundException);
    });

    it('should update order status', async () => {
      const order = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue({
        ...order,
        status: OrderStatus.SHIPPED,
      });

      const result = await service.updateStatus('o1', OrderStatus.SHIPPED);

      expect(result.status).toBe(OrderStatus.SHIPPED);
      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('should emit order.status-changed event', async () => {
      await service.updateStatus('o1', OrderStatus.SHIPPED);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.status-changed',
        expect.any(OrderStatusChangeEvent)
      );
    });

    it('should restore inventory when cancelling', async () => {
      const order = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
      });
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);

      await service.updateStatus('o1', OrderStatus.CANCELLED);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
    });

    it('should not restore inventory when status change does not require it', async () => {
      const order = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue({
        ...order,
        status: OrderStatus.PAID,
      });

      await service.updateStatus('o1', OrderStatus.PAID);

      expect(inventoryService.adjustInventory).not.toHaveBeenCalled();
    });
  });

  describe('markAsDelivered', () => {
    beforeEach(() => {
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);
      orderRepo.save!.mockResolvedValue(mockOrder);
      eventEmitter.emit!.mockReturnValue(true);
    });

    it('should mark order as delivered and set deliveredAt', async () => {
      const result = await service.markAsDelivered('o1');

      expect(result.shipping.deliveredAt).toBeDefined();
      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('should update status to DELIVERED', async () => {
      await service.markAsDelivered('o1');

      expect(orderRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateShippingInfo', () => {
    const shippingInfoDto: UpdateShippingInfoDto = {
      trackingNumber: 'TRACK123',
      estimatedDeliveryDate: new Date('2024-12-31').toString(),
      shippingMethod: 'Express',
      deliveryInstructions: 'Leave at door',
    };

    beforeEach(() => {
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);
      orderRepo.save!.mockResolvedValue(mockOrder);
      eventEmitter.emit!.mockReturnValue(true);
    });

    it('should update shipping info', async () => {
      const result = await service.updateShippingInfo('o1', shippingInfoDto);

      expect(result.shipping.trackingNumber).toBe('TRACK123');
      expect(result.shipping.shippingMethod).toBe('Express');
      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('should set shippedAt timestamp', async () => {
      const result = await service.updateShippingInfo('o1', shippingInfoDto);

      expect(result.shipping.shippedAt).toBeDefined();
    });

    it('should update status to SHIPPED if not already', async () => {
      const order = { ...mockOrder, status: OrderStatus.PAID };
      orderRepo.findWithItems!.mockResolvedValue(order);

      await service.updateShippingInfo('o1', shippingInfoDto);

      expect(orderRepo.save).toHaveBeenCalled();
    });
  });

  describe('paid', () => {
    beforeEach(() => {
      orderRepo.findById!.mockResolvedValue(mockOrder);
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);
      orderRepo.save!.mockResolvedValue(mockOrder);
      analyticsQueue.addEvent!.mockResolvedValue(undefined as any);
      eventEmitter.emit!.mockReturnValue(true);
    });

    it('should mark order as paid', async () => {
      await service.paid('o1');

      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('should record analytics event', async () => {
      await service.paid('o1');

      expect(service['recordEvent']).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findById!.mockResolvedValue(null);

      await expect(service.paid('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('cancelOrder', () => {
    beforeEach(() => {
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);
      orderRepo.save!.mockResolvedValue(mockOrder);
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      eventEmitter.emit!.mockReturnValue(true);
    });

    it('should cancel order and restore inventory', async () => {
      await service.cancelOrder('o1', 'Customer request');

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for shipped orders', async () => {
      const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
      orderRepo.findWithItems!.mockResolvedValue(shippedOrder);

      await expect(service.cancelOrder('o1')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.cancelOrder('o1')).rejects.toThrow(
        'Cannot cancel order in shipped status'
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findWithItems!.mockResolvedValue(null);

      await expect(service.cancelOrder('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('returnOrder', () => {
    beforeEach(() => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      orderRepo.findWithItems!.mockResolvedValue(deliveredOrder);
      orderRepo.save!.mockResolvedValue(deliveredOrder);
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      eventEmitter.emit!.mockReturnValue(true);
    });

    it('should process full return and restore inventory', async () => {
      await service.returnOrder('o1');

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
      expect(orderRepo.save).toHaveBeenCalled();
    });

    it('should process partial return for specific items', async () => {
      await service.returnOrder('o1', ['oi1']);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
    });

    it('should throw BadRequestException for non-delivered orders', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepo.findWithItems!.mockResolvedValue(pendingOrder);

      await expect(service.returnOrder('o1')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.returnOrder('o1')).rejects.toThrow(
        'Only delivered orders can be returned'
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findWithItems!.mockResolvedValue(null);

      await expect(service.returnOrder('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getOrderInventoryImpact', () => {
    beforeEach(() => {
      orderRepo.findWithItems!.mockResolvedValue(mockOrder);
    });

    it('should return inventory impact summary', async () => {
      const result = await service.getOrderInventoryImpact('o1');

      expect(result).toEqual({
        totalItems: 1,
        totalUnits: 2,
        itemsWithInventory: 1,
        estimatedValue: 20.0,
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findWithItems!.mockResolvedValue(null);

      await expect(
        service.getOrderInventoryImpact('nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findWithRelations', () => {
    it('should find order with all relations', async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);

      const result = await service.findWithRelations('o1');

      expect(result).toEqual(mockOrder);
      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'o1' },
        relations: [
          'items',
          'items.variant',
          'items.variant.product',
          'store',
          'user',
        ],
      });
    });

    it('should return null when order not found', async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      const result = await service.findWithRelations('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('inventory restoration logic', () => {
    it('should restore inventory when cancelling from PENDING', async () => {
      const order = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue(order);
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      eventEmitter.emit!.mockReturnValue(true);

      await service.updateStatus('o1', OrderStatus.CANCELLED);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
    });

    it('should restore inventory when cancelling from PAID', async () => {
      const order = { ...mockOrder, status: OrderStatus.PAID };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue(order);
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      eventEmitter.emit!.mockReturnValue(true);

      await service.updateStatus('o1', OrderStatus.CANCELLED);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
    });

    it('should restore inventory when returning from DELIVERED', async () => {
      const order = { ...mockOrder, status: OrderStatus.DELIVERED };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue(order);
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      eventEmitter.emit!.mockReturnValue(true);

      await service.updateStatus('o1', OrderStatus.RETURNED);

      expect(inventoryService.adjustInventory).toHaveBeenCalledWith('v1', 2);
    });

    it('should handle inventory restoration errors gracefully', async () => {
      const order = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepo.findWithItems!.mockResolvedValue(order);
      orderRepo.save!.mockResolvedValue(order);
      inventoryService.adjustInventory!.mockRejectedValue(
        new Error('Inventory error')
      );
      eventEmitter.emit!.mockReturnValue(true);

      // Should not throw - logs error and continues
      await service.updateStatus('o1', OrderStatus.CANCELLED);

      expect(inventoryService.adjustInventory).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      inventoryService.findInventoryByVariantId!.mockResolvedValue(
        mockInventory
      );
      inventoryService.adjustInventory!.mockResolvedValue(mockInventory);
      txOrderRepo.create.mockReturnValue(mockOrder);
      txOrderRepo.save.mockResolvedValue(mockOrder);
      txOrderRepo.findOne.mockResolvedValue(mockOrder);
      txItemRepo.create.mockReturnValue(mockOrderItem);
      txItemRepo.save.mockResolvedValue(mockOrderItem);
      eventEmitter.emit!.mockReturnValue(true);
      analyticsQueue.addEvent!.mockResolvedValue(undefined as any);
    });

    it('should emit order.created event with correct data', async () => {
      await service.createOrder(createOrderDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({
          orderId: expect.any(String),
          orderNumber: expect.stringContaining('ORD-'),
          totalAmount: 20.0,
        })
      );
    });

    it('should emit order.status-changed event on status update', async () => {
      // Create a fresh copy of mockOrder for this test to avoid mutation issues
      const testOrder = {
        ...mockOrder,
        id: 'o1',
        status: OrderStatus.PENDING,
        items: [mockOrderItem],
        store: mockStore,
        user: mockUser,
        shipping: mockOrderInfo,
        billing: mockOrderInfo,
      };

      orderRepo.findWithItems!.mockResolvedValue(testOrder);

      // Return a copy with updated status
      const updatedOrder = {
        ...testOrder,
        status: OrderStatus.SHIPPED,
      };
      orderRepo.save!.mockResolvedValue(updatedOrder);

      await service.updateStatus('o1', OrderStatus.SHIPPED);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.status-changed',
        expect.objectContaining({
          orderId: 'o1',
          previousStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.SHIPPED,
        })
      );
    });

    it('should handle event emission errors gracefully', async () => {
      eventEmitter.emit!.mockImplementation(() => {
        throw new Error('Event error');
      });

      // Should not throw
      await service.createOrder(createOrderDto);
    });
  });
});
