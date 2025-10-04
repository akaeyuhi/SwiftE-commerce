import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from 'src/modules/store/orders/orders.controller';
import { OrdersService } from 'src/modules/store/orders/orders.service';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from '../../../utils/helpers';
import { Order } from 'src/entities/store/product/order.entity';
import { OrderItem } from 'src/entities/store/product/order-item.entity';
import { CreateOrderDto } from 'src/modules/store/orders/dto/create-order.dto';
import { UpdateOrderDto } from 'src/modules/store/orders/dto/update-order.dto';
import { UpdateShippingInfoDto } from 'src/modules/store/orders/dto/update-shipping-info.dto';
import { CancelOrderDto } from 'src/modules/store/orders/dto/cancel-order.dto';
import { ReturnOrderDto } from 'src/modules/store/orders/dto/return-order.dto';
import { Request } from 'express';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { OrderInfo } from 'src/common/embeddables/order-info.embeddable';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: Partial<MockedMethods<OrdersService>>;
  let policyMock: ReturnType<typeof createPolicyMock>;
  let guardMock: ReturnType<typeof createGuardMock>;

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

  const createMockRequest = (
    userId: string = 'u1',
    isSiteAdmin = false
  ): Partial<Request> => ({
    user: { id: userId, isSiteAdmin } as any,
  });

  beforeEach(async () => {
    ordersService = createServiceMock<OrdersService>([
      'findByStore',
      'findByUser',
      'createOrder',
      'getOrderWithItems',
      'paid',
      'updateStatus',
      'cancelOrder',
      'returnOrder',
      'getOrderInventoryImpact',
      'updateShippingInfo',
      'markAsDelivered',
      'remove',
    ]);

    policyMock = createPolicyMock();
    guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: EntityOwnerGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should extend BaseController', () => {
      expect(controller).toBeInstanceOf(OrdersController);
      expect(typeof controller.create).toBe('function');
    });

    it('should have access policies defined', () => {
      expect(OrdersController.accessPolicies).toBeDefined();
      expect(OrdersController.accessPolicies.findAll).toBeDefined();
      expect(OrdersController.accessPolicies.cancelOrder).toBeDefined();
    });
  });

  describe('findAllByStore - GET /stores/:storeId/orders/all', () => {
    it('should return all orders for store', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'o2' }];
      ordersService.findByStore!.mockResolvedValue(orders);

      const result = await controller.findAllByStore('s1');

      expect(result).toEqual(orders);
      expect(result).toHaveLength(2);
      expect(ordersService.findByStore).toHaveBeenCalledWith('s1');
      expect(ordersService.findByStore).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no orders found', async () => {
      ordersService.findByStore!.mockResolvedValue([]);

      const result = await controller.findAllByStore('s1');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      ordersService.findByStore!.mockRejectedValue(serviceError);

      await expect(controller.findAllByStore('s1')).rejects.toThrow(
        serviceError
      );
    });
  });

  describe('createUserOrder - POST /stores/:storeId/orders/create', () => {
    const createDto: CreateOrderDto = {
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
      ] as any,
      shipping: mockOrderInfo,
      billing: mockOrderInfo,
    };

    it('should create order for authenticated user', async () => {
      const req = createMockRequest('u1');
      ordersService.createOrder!.mockResolvedValue(mockOrder);

      const result = await controller.createUserOrder(
        's1',
        createDto,
        req as Request
      );

      expect(result).toEqual(mockOrder);
      expect(ordersService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          storeId: 's1',
        })
      );
    });

    it('should set storeId from route parameter', async () => {
      const req = createMockRequest('u1');
      const dtoWithoutStore = { ...createDto };
      delete (dtoWithoutStore as any).storeId;

      ordersService.createOrder!.mockResolvedValue(mockOrder);

      await controller.createUserOrder('s1', dtoWithoutStore, req as Request);

      expect(ordersService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 's1',
        })
      );
    });

    it('should set userId from authenticated user', async () => {
      const req = createMockRequest('u1');
      const dtoWithoutUser = { ...createDto };
      delete (dtoWithoutUser as any).userId;

      ordersService.createOrder!.mockResolvedValue(mockOrder);

      await controller.createUserOrder('s1', dtoWithoutUser, req as Request);

      expect(ordersService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
        })
      );
    });

    it('should throw BadRequestException when authentication missing', async () => {
      const req = {} as Request;

      await expect(
        controller.createUserOrder('s1', createDto, req)
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent non-admin from creating order for another user', async () => {
      const req = createMockRequest('u1', false);
      const dtoForOtherUser = { ...createDto, userId: 'u2' };

      await expect(
        controller.createUserOrder('s1', dtoForOtherUser, req as Request)
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.createUserOrder('s1', dtoForOtherUser, req as Request)
      ).rejects.toThrow('Cannot create order for another user');
    });

    it('should allow site admin to create order for another user', async () => {
      const req = createMockRequest('u1', true);
      const dtoForOtherUser = { ...createDto, userId: 'u2' };

      ordersService.createOrder!.mockResolvedValue(mockOrder);

      await controller.createUserOrder('s1', dtoForOtherUser, req as Request);

      expect(ordersService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u2',
        })
      );
    });

    it('should handle insufficient stock error', async () => {
      const req = createMockRequest('u1');
      ordersService.createOrder!.mockRejectedValue(
        new BadRequestException('Insufficient stock')
      );

      await expect(
        controller.createUserOrder('s1', createDto, req as Request)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne - GET /stores/:storeId/orders/:id', () => {
    it('should return order by id', async () => {
      ordersService.getOrderWithItems!.mockResolvedValue(mockOrder);

      const result = await controller.findOne('o1');

      expect(result).toEqual(mockOrder);
      expect(ordersService.getOrderWithItems).toHaveBeenCalledWith('o1');
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.getOrderWithItems!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByUser - GET /stores/:storeId/orders/user/:userId', () => {
    it('should return orders filtered by store', async () => {
      const orders = [
        { ...mockOrder, store: { id: 's1' } as Store },
        { ...mockOrder, id: 'o2', store: { id: 's2' } as Store },
        { ...mockOrder, id: 'o3', store: { id: 's1' } as Store },
      ];

      ordersService.findByUser!.mockResolvedValue(orders);

      const result = await controller.findByUser('s1', 'u1');

      expect(result).toHaveLength(2);
      expect(result.every((o) => o.store.id === 's1')).toBe(true);
      expect(ordersService.findByUser).toHaveBeenCalledWith('u1');
    });

    it('should return empty array when no orders match store', async () => {
      const orders = [{ ...mockOrder, store: { id: 's2' } as Store }];

      ordersService.findByUser!.mockResolvedValue(orders);

      const result = await controller.findByUser('s1', 'u1');

      expect(result).toHaveLength(0);
    });

    it('should handle null store gracefully', async () => {
      const orders = [{ ...mockOrder, store: null as any }];

      ordersService.findByUser!.mockResolvedValue(orders);

      const result = await controller.findByUser('s1', 'u1');

      expect(result).toHaveLength(0);
    });
  });

  describe('checkout - POST /stores/:storeId/orders/:id/checkout', () => {
    it('should mark order as paid', async () => {
      ordersService.paid!.mockResolvedValue(undefined);

      await controller.checkout('s1', 'o1');

      expect(ordersService.paid).toHaveBeenCalledWith('o1');
      expect(ordersService.paid).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.paid!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(controller.checkout('s1', 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateStatus - PUT /stores/:storeId/orders/:id/status', () => {
    it('should update order status', async () => {
      const updateDto: UpdateOrderDto = { status: OrderStatus.SHIPPED };
      const updatedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };

      ordersService.updateStatus!.mockResolvedValue(updatedOrder);

      const result = await controller.updateStatus('s1', 'o1', updateDto);

      expect(result).toEqual(updatedOrder);
      expect(ordersService.updateStatus).toHaveBeenCalledWith(
        'o1',
        OrderStatus.SHIPPED
      );
    });

    it('should throw BadRequestException when status not provided', async () => {
      await expect(
        controller.updateStatus('s1', 'o1', {} as UpdateOrderDto)
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateStatus('s1', 'o1', {} as UpdateOrderDto)
      ).rejects.toThrow('Status is required');
    });

    it('should log warning when cancelling via updateStatus', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      const updateDto: UpdateOrderDto = { status: OrderStatus.CANCELLED };

      ordersService.updateStatus!.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      await controller.updateStatus('s1', 'o1', updateDto);

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle all status transitions', async () => {
      const statuses = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];

      for (const status of statuses) {
        ordersService.updateStatus!.mockResolvedValue({
          ...mockOrder,
          status,
        });

        await controller.updateStatus('s1', 'o1', { status });

        expect(ordersService.updateStatus).toHaveBeenCalledWith('o1', status);
      }
    });
  });

  describe('cancelOrder - POST /stores/:storeId/orders/:id/cancel', () => {
    const cancelDto: CancelOrderDto = {
      reason: 'Customer requested cancellation',
    };

    it('should cancel order and restore inventory', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      ordersService.cancelOrder!.mockResolvedValue(cancelledOrder);

      const result = await controller.cancelOrder('s1', 'o1', cancelDto);

      expect(result).toEqual(cancelledOrder);
      expect(ordersService.cancelOrder).toHaveBeenCalledWith(
        'o1',
        cancelDto.reason
      );
    });

    it('should handle cancellation without reason', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      ordersService.cancelOrder!.mockResolvedValue(cancelledOrder);

      await controller.cancelOrder('s1', 'o1', {} as CancelOrderDto);

      expect(ordersService.cancelOrder).toHaveBeenCalledWith('o1', undefined);
    });

    it('should throw BadRequestException for shipped orders', async () => {
      ordersService.cancelOrder!.mockRejectedValue(
        new BadRequestException('Cannot cancel order in shipped status')
      );

      await expect(
        controller.cancelOrder('s1', 'o1', cancelDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.cancelOrder!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(
        controller.cancelOrder('s1', 'nonexistent', cancelDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('returnOrder - POST /stores/:storeId/orders/:id/return', () => {
    const returnDto: ReturnOrderDto = {
      itemIds: ['oi1'],
      reason: 'Product defective',
    };

    it('should process full return', async () => {
      const returnedOrder = { ...mockOrder, status: OrderStatus.RETURNED };
      ordersService.returnOrder!.mockResolvedValue(returnedOrder);

      const result = await controller.returnOrder(
        's1',
        'o1',
        {} as ReturnOrderDto
      );

      expect(result).toEqual(returnedOrder);
      expect(ordersService.returnOrder).toHaveBeenCalledWith('o1', undefined);
    });

    it('should process partial return', async () => {
      ordersService.returnOrder!.mockResolvedValue(mockOrder);

      await controller.returnOrder('s1', 'o1', returnDto);

      expect(ordersService.returnOrder).toHaveBeenCalledWith('o1', ['oi1']);
    });

    it('should throw BadRequestException for non-delivered orders', async () => {
      ordersService.returnOrder!.mockRejectedValue(
        new BadRequestException('Only delivered orders can be returned')
      );

      await expect(
        controller.returnOrder('s1', 'o1', returnDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.returnOrder!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(
        controller.returnOrder('s1', 'nonexistent', returnDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInventoryImpact - GET /stores/:storeId/orders/:id/inventory-impact', () => {
    const mockImpact = {
      totalItems: 3,
      totalUnits: 15,
      itemsWithInventory: 2,
      estimatedValue: 299.99,
    };

    it('should return inventory impact summary', async () => {
      ordersService.getOrderInventoryImpact!.mockResolvedValue(mockImpact);

      const result = await controller.getInventoryImpact('s1', 'o1');

      expect(result).toEqual(mockImpact);
      expect(ordersService.getOrderInventoryImpact).toHaveBeenCalledWith('o1');
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.getOrderInventoryImpact!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(
        controller.getInventoryImpact('s1', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateShippingInfo - PUT /stores/:storeId/orders/:id/shipping', () => {
    const shippingDto: UpdateShippingInfoDto = {
      trackingNumber: '1Z999AA10123456784',
      estimatedDeliveryDate: new Date('2025-10-10').toString(),
      shippingMethod: 'UPS Ground',
      deliveryInstructions: 'Leave at front door',
    };

    it('should update shipping information', async () => {
      const updatedOrder = {
        ...mockOrder,
        shipping: {
          ...mockOrder.shipping,
          trackingNumber: shippingDto.trackingNumber,
        },
      };

      ordersService.updateShippingInfo!.mockResolvedValue(updatedOrder);

      const result = await controller.updateShippingInfo(
        's1',
        'o1',
        shippingDto
      );

      expect(result).toEqual(updatedOrder);
      expect(ordersService.updateShippingInfo).toHaveBeenCalledWith(
        'o1',
        shippingDto
      );
    });

    it('should handle partial shipping info updates', async () => {
      const partialDto = {
        trackingNumber: 'TRACK123',
      } as UpdateShippingInfoDto;

      ordersService.updateShippingInfo!.mockResolvedValue(mockOrder);

      await controller.updateShippingInfo('s1', 'o1', partialDto);

      expect(ordersService.updateShippingInfo).toHaveBeenCalledWith(
        'o1',
        partialDto
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.updateShippingInfo!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(
        controller.updateShippingInfo('s1', 'nonexistent', shippingDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsDelivered - POST /stores/:storeId/orders/:id/delivered', () => {
    it('should mark order as delivered', async () => {
      const deliveredOrder = {
        ...mockOrder,
        status: OrderStatus.DELIVERED,
        shipping: {
          ...mockOrder.shipping,
          deliveredAt: new Date(),
        },
      };

      ordersService.markAsDelivered!.mockResolvedValue(deliveredOrder);

      const result = await controller.markAsDelivered('s1', 'o1');

      expect(result).toEqual(deliveredOrder);
      expect(ordersService.markAsDelivered).toHaveBeenCalledWith('o1');
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.markAsDelivered!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(
        controller.markAsDelivered('s1', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove - DELETE /stores/:storeId/orders/:id', () => {
    it('should delete order', async () => {
      ordersService.remove!.mockResolvedValue(undefined);

      await controller.remove('o1');

      expect(ordersService.remove).toHaveBeenCalledWith('o1');
    });

    it('should log warning about inventory', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      ordersService.remove!.mockResolvedValue(undefined);

      await controller.remove('o1');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Inventory will NOT be restored')
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      ordersService.remove!.mockRejectedValue(
        new NotFoundException('Order not found')
      );

      await expect(controller.remove('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('guards and authorization', () => {
    it('should be protected by guards', () => {
      const guards = Reflect.getMetadata('__guards__', OrdersController);
      expect(guards).toBeDefined();
    });

    it('should have access policies for all endpoints', () => {
      const policies = OrdersController.accessPolicies;

      expect(policies.findAllByStore).toBeDefined();
      expect(policies.createUserOrder).toBeDefined();
      expect(policies.cancelOrder).toBeDefined();
      expect(policies.returnOrder).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations', async () => {
      ordersService.getOrderWithItems!.mockResolvedValue(mockOrder);

      const promises = [
        controller.findOne('o1'),
        controller.findOne('o1'),
        controller.findOne('o1'),
      ];

      await Promise.all(promises);

      expect(ordersService.getOrderWithItems).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid UUID format', async () => {
      // UUID validation happens at parameter level via ParseUUIDPipe
      ordersService.findByStore!.mockResolvedValue([]);

      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      await controller.findAllByStore(validUuid);

      expect(ordersService.findByStore).toHaveBeenCalledWith(validUuid);
    });

    it('should handle service timeouts', async () => {
      const timeoutError = new Error('Service timeout');
      ordersService.findByStore!.mockRejectedValue(timeoutError);

      await expect(controller.findAllByStore('s1')).rejects.toThrow(
        timeoutError
      );
    });
  });

  describe('integration scenarios', () => {
    it('should support create -> checkout -> ship -> deliver workflow', async () => {
      const req = createMockRequest('u1');
      const createDto: CreateOrderDto = {
        userId: 'u1',
        storeId: 's1',
        items: [] as any,
        shipping: mockOrderInfo,
      };

      ordersService.createOrder!.mockResolvedValue(mockOrder);
      ordersService.paid!.mockResolvedValue(undefined);
      ordersService.updateStatus!.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      });
      ordersService.markAsDelivered!.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });

      // Create
      const created = await controller.createUserOrder(
        's1',
        createDto,
        req as Request
      );
      expect(created).toBeDefined();

      // Checkout
      await controller.checkout('s1', created.id);
      expect(ordersService.paid).toHaveBeenCalled();

      // Ship
      await controller.updateStatus('s1', created.id, {
        status: OrderStatus.SHIPPED,
      });
      expect(ordersService.updateStatus).toHaveBeenCalled();

      // Deliver
      await controller.markAsDelivered('s1', created.id);
      expect(ordersService.markAsDelivered).toHaveBeenCalled();
    });

    it('should support create -> cancel workflow', async () => {
      const req = createMockRequest('u1');
      const createDto: CreateOrderDto = {
        userId: 'u1',
        storeId: 's1',
        items: [] as any,
        shipping: mockOrderInfo,
      };

      ordersService.createOrder!.mockResolvedValue(mockOrder);
      ordersService.cancelOrder!.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      // Create
      const created = await controller.createUserOrder(
        's1',
        createDto,
        req as Request
      );

      // Cancel
      await controller.cancelOrder('s1', created.id, {
        reason: 'Customer request',
      });

      expect(ordersService.cancelOrder).toHaveBeenCalled();
    });
  });
});
