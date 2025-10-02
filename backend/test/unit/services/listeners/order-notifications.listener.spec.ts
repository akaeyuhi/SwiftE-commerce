import { Test, TestingModule } from '@nestjs/testing';
import { OrderNotificationService } from 'src/modules/infrastructure/notifications/order/order-notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import {
  OrderCreatedEvent,
  OrderStatusChangeEvent,
  OrderShippingInfo,
  OrderItemInfo,
} from 'src/common/events/orders/order-status-change.event';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';
import { createMock, MockedMethods } from '../../utils/helpers';
import { OrderNotificationsListener } from 'src/modules/store/orders/listeners/order-notifications.listener';

describe('OrderNotificationsListener', () => {
  let listener: OrderNotificationsListener;
  let orderNotificationService: Partial<
    MockedMethods<OrderNotificationService>
  >;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;

  const mockOrderItem: OrderItemInfo = {
    productName: 'Test Product',
    sku: 'TEST-SKU-001',
    quantity: 2,
    unitPrice: 25.99,
    lineTotal: 51.98,
  };

  const mockShippingInfo: OrderShippingInfo = {
    firstName: 'John',
    lastName: 'Doe',
    company: 'ACME Corp',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    phone: '+1-555-0100',
    email: 'john@example.com',
    deliveryInstructions: 'Leave at front door',
    shippingMethod: 'Express',
    trackingNumber: 'TRACK123456',
    estimatedDeliveryDate: new Date('2025-10-10'),
    shippedAt: new Date('2025-10-05'),
    deliveredAt: new Date('2025-10-09'),
  };

  const mockOrderCreatedEvent: OrderCreatedEvent = {
    orderId: 'order-1',
    orderNumber: 'ORD-12345',
    userId: 'user-1',
    userEmail: 'customer@example.com',
    userName: 'John Doe',
    storeId: 'store-1',
    storeName: 'Test Store',
    totalAmount: 51.98,
    items: [mockOrderItem],
    orderUrl: 'https://example.com/orders/order-1',
    shipping: mockShippingInfo,
    billing: mockShippingInfo,
  };

  const mockOrderStatusChangeEvent: OrderStatusChangeEvent = {
    orderId: 'order-1',
    orderNumber: 'ORD-12345',
    previousStatus: OrderStatus.PAID,
    newStatus: OrderStatus.SHIPPED,
    userId: 'user-1',
    userEmail: 'customer@example.com',
    userName: 'John Doe',
    storeId: 'store-1',
    storeName: 'Test Store',
    totalAmount: 51.98,
    items: [mockOrderItem],
    shipping: mockShippingInfo,
    billing: mockShippingInfo,
  };

  beforeEach(async () => {
    orderNotificationService = createMock<OrderNotificationService>([
      'notifyOrderConfirmation',
      'notifyOrderShipped',
      'notifyOrderDelivered',
      'notifyOrderCancelled',
    ]);

    eventEmitter = createMock<EventEmitter2>(['on', 'emit']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderNotificationsListener,
        {
          provide: OrderNotificationService,
          useValue: orderNotificationService,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    listener = module.get<OrderNotificationsListener>(
      OrderNotificationsListener
    );

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(listener).toBeDefined();
    });

    it('should extend BaseNotificationListener', () => {
      expect(listener).toBeInstanceOf(OrderNotificationsListener);
    });
  });

  describe('getEventTypes', () => {
    it('should return supported event types', () => {
      const eventTypes = (listener as any).getEventTypes();

      expect(eventTypes).toEqual(['order.created', 'order.status-changed']);
      expect(eventTypes).toHaveLength(2);
    });
  });

  describe('shouldProcessEvent', () => {
    it('should process event with valid email', () => {
      const event: DomainEvent<OrderCreatedEvent> = {
        type: 'order.created',
        data: mockOrderCreatedEvent,
        aggregateId: '',
        occurredAt: new Date(),
      };

      const result = (listener as any).shouldProcessEvent(event);

      expect(result).toBe(true);
    });

    it('should not process event without email', () => {
      const event: DomainEvent<OrderCreatedEvent> = {
        type: 'order.created',
        data: { ...mockOrderCreatedEvent, userEmail: undefined as any },
        aggregateId: '',
        occurredAt: new Date(),
      };

      const result = (listener as any).shouldProcessEvent(event);

      expect(result).toBe(false);
    });

    it('should not process event with invalid email', () => {
      const event: DomainEvent<OrderCreatedEvent> = {
        type: 'order.created',
        data: { ...mockOrderCreatedEvent, userEmail: 'invalid-email' },
      } as DomainEvent;

      const result = (listener as any).shouldProcessEvent(event);

      expect(result).toBe(false);
    });

    it('should not process event with null data', () => {
      const event: DomainEvent<any> = {
        type: 'order.created',
        data: null,
      } as DomainEvent;

      const result = (listener as any).shouldProcessEvent(event);

      expect(result).toBe(false);
    });
  });

  describe('handleEvent', () => {
    it('should route order.created event to handleOrderCreated', async () => {
      const handleOrderCreatedSpy = jest
        .spyOn(listener as any, 'handleOrderCreated')
        .mockResolvedValue(undefined);

      const event: DomainEvent<OrderCreatedEvent> = {
        type: 'order.created',
        data: mockOrderCreatedEvent,
      } as DomainEvent;

      await (listener as any).handleEvent(event);

      expect(handleOrderCreatedSpy).toHaveBeenCalledWith(mockOrderCreatedEvent);
    });

    it('should route order.status-changed event to handleOrderStatusChange', async () => {
      const handleOrderStatusChangeSpy = jest
        .spyOn(listener as any, 'handleOrderStatusChange')
        .mockResolvedValue(undefined);

      const event: DomainEvent<OrderStatusChangeEvent> = {
        type: 'order.status-changed',
        data: mockOrderStatusChangeEvent,
      } as DomainEvent;

      await (listener as any).handleEvent(event);

      expect(handleOrderStatusChangeSpy).toHaveBeenCalledWith(
        mockOrderStatusChangeEvent
      );
    });

    it('should log warning for unknown event type', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      const event: DomainEvent<any> = {
        type: 'unknown.event' as any,
        data: {},
      } as DomainEvent;

      await (listener as any).handleEvent(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown event type')
      );
    });
  });

  describe('handleOrderCreated', () => {
    it('should send order confirmation notification', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
          storeId: 'store-1',
          storeName: 'Test Store',
          userId: 'user-1',
          totalAmount: 51.98,
        })
      );
    });

    it('should include order items in notification', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          items: [
            {
              productName: 'Test Product',
              sku: 'TEST-SKU-001',
              quantity: 2,
              unitPrice: 25.99,
              lineTotal: 51.98,
            },
          ],
        })
      );
    });

    it('should include formatted shipping address', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          shippingAddress: expect.any(String),
          shippingAddressLine1: '123 Main St',
          shippingAddressLine2: 'Apt 4B',
          shippingCity: 'New York',
          shippingState: 'NY',
          shippingPostalCode: '10001',
          shippingCountry: 'USA',
          shippingPhone: '+1-555-0100',
        })
      );
    });

    it('should include shipping method', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          shippingMethod: 'Express',
        })
      );
    });

    it('should use default shipping method when not provided', async () => {
      const eventWithoutMethod = {
        ...mockOrderCreatedEvent,
        shipping: { ...mockShippingInfo, shippingMethod: undefined },
      };

      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(eventWithoutMethod);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          shippingMethod: 'Standard Shipping',
        })
      );
    });

    it('should include order URL and formatted date', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          orderUrl: 'https://example.com/orders/order-1',
          orderDate: expect.any(String),
        })
      );
    });

    it('should log processing message', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing order confirmation')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Order confirmation queued')
      );
    });
  });

  describe('handleOrderStatusChange', () => {
    it('should route to handleOrderShipped for SHIPPED status', async () => {
      const handleOrderShippedSpy = jest
        .spyOn(listener as any, 'handleOrderShipped')
        .mockResolvedValue(undefined);

      await (listener as any).handleOrderStatusChange(
        mockOrderStatusChangeEvent
      );

      expect(handleOrderShippedSpy).toHaveBeenCalledWith(
        mockOrderStatusChangeEvent
      );
    });

    it('should route to handleOrderDelivered for DELIVERED status', async () => {
      const handleOrderDeliveredSpy = jest
        .spyOn(listener as any, 'handleOrderDelivered')
        .mockResolvedValue(undefined);

      const event = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.DELIVERED,
      };

      await (listener as any).handleOrderStatusChange(event);

      expect(handleOrderDeliveredSpy).toHaveBeenCalledWith(event);
    });

    it('should route to handleOrderCancelled for CANCELLED status', async () => {
      const handleOrderCancelledSpy = jest
        .spyOn(listener as any, 'handleOrderCancelled')
        .mockResolvedValue(undefined);

      const event = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.CANCELLED,
      };

      await (listener as any).handleOrderStatusChange(event);

      expect(handleOrderCancelledSpy).toHaveBeenCalledWith(event);
    });

    it('should log debug message for unconfigured statuses', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');

      const event = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.PENDING,
      };

      await (listener as any).handleOrderStatusChange(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No notification configured for status')
      );
    });

    it('should log status change message', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      jest
        .spyOn(listener as any, 'handleOrderShipped')
        .mockResolvedValue(undefined);

      await (listener as any).handleOrderStatusChange(
        mockOrderStatusChangeEvent
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing status change')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('paid → shipped')
      );
    });
  });

  describe('handleOrderShipped', () => {
    it('should send order shipped notification', async () => {
      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(mockOrderStatusChangeEvent);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
          trackingNumber: 'TRACK123456',
        })
      );
    });

    it('should include tracking URL', async () => {
      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(mockOrderStatusChangeEvent);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          trackingUrl: expect.stringContaining('TRACK123456'),
        })
      );
    });

    it('should handle missing tracking number', async () => {
      const eventWithoutTracking = {
        ...mockOrderStatusChangeEvent,
        shipping: { ...mockShippingInfo, trackingNumber: undefined },
      };

      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(eventWithoutTracking);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          trackingNumber: undefined,
          trackingUrl: undefined,
        })
      );
    });

    it('should include estimated delivery date', async () => {
      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(mockOrderStatusChangeEvent);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          estimatedDeliveryDate: expect.any(String),
        })
      );
    });

    it('should include shipped date', async () => {
      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(mockOrderStatusChangeEvent);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          shippedDate: expect.any(String),
        })
      );
    });

    it('should use current date when shippedAt not provided', async () => {
      const eventWithoutShippedAt = {
        ...mockOrderStatusChangeEvent,
        shipping: { ...mockShippingInfo, shippedAt: undefined },
      };

      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(eventWithoutShippedAt);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          shippedDate: expect.any(String),
        })
      );
    });

    it('should handle missing shipping info', async () => {
      const eventWithoutShipping = {
        ...mockOrderStatusChangeEvent,
        shipping: undefined,
      };

      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);

      await (listener as any).handleOrderShipped(eventWithoutShipping);

      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          shippingAddress: 'Address not provided',
        })
      );
    });
  });

  describe('handleOrderDelivered', () => {
    it('should send order delivered notification', async () => {
      const deliveredEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.DELIVERED,
      };

      orderNotificationService.notifyOrderDelivered!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderDelivered(deliveredEvent);

      expect(
        orderNotificationService.notifyOrderDelivered
      ).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
        })
      );
    });

    it('should include delivered date', async () => {
      const deliveredEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.DELIVERED,
      };

      orderNotificationService.notifyOrderDelivered!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderDelivered(deliveredEvent);

      expect(
        orderNotificationService.notifyOrderDelivered
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          deliveredDate: expect.any(String),
        })
      );
    });

    it('should include review and support URLs', async () => {
      const deliveredEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.DELIVERED,
      };

      orderNotificationService.notifyOrderDelivered!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderDelivered(deliveredEvent);

      expect(
        orderNotificationService.notifyOrderDelivered
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          reviewUrl: expect.stringContaining('/orders/order-1/review'),
          supportUrl: expect.stringContaining('/stores/store-1/support'),
        })
      );
    });

    it('should use current date when deliveredAt not provided', async () => {
      const deliveredEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.DELIVERED,
        shipping: { ...mockShippingInfo, deliveredAt: undefined },
      };

      orderNotificationService.notifyOrderDelivered!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderDelivered(deliveredEvent);

      expect(
        orderNotificationService.notifyOrderDelivered
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          deliveredDate: expect.any(String),
        })
      );
    });
  });

  describe('handleOrderCancelled', () => {
    it('should send order cancelled notification', async () => {
      const cancelledEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.CANCELLED,
      };

      orderNotificationService.notifyOrderCancelled!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCancelled(cancelledEvent);

      expect(
        orderNotificationService.notifyOrderCancelled
      ).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
        })
      );
    });

    it('should include cancellation details', async () => {
      const cancelledEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.CANCELLED,
      };

      orderNotificationService.notifyOrderCancelled!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCancelled(cancelledEvent);

      expect(
        orderNotificationService.notifyOrderCancelled
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          cancelledDate: expect.any(String),
          refundAmount: 51.98,
          refundMethod: 'Original payment method',
        })
      );
    });

    it('should include order items', async () => {
      const cancelledEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.CANCELLED,
      };

      orderNotificationService.notifyOrderCancelled!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCancelled(cancelledEvent);

      expect(
        orderNotificationService.notifyOrderCancelled
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              productName: 'Test Product',
              quantity: 2,
            }),
          ]),
        })
      );
    });
  });

  describe('generateTrackingUrl', () => {
    it('should generate USPS tracking URL', () => {
      const url = (listener as any).generateTrackingUrl('TRACK123456');

      expect(url).toContain('tools.usps.com');
      expect(url).toContain('TRACK123456');
    });

    it('should handle different tracking numbers', () => {
      const url1 = (listener as any).generateTrackingUrl('ABC123');
      const url2 = (listener as any).generateTrackingUrl('XYZ789');

      expect(url1).toContain('ABC123');
      expect(url2).toContain('XYZ789');
    });
  });

  describe('error handling', () => {
    it('should handle notification service errors gracefully', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockRejectedValue(
        new Error('Email service error')
      );

      // Should not throw
      await expect(
        (listener as any).handleOrderCreated(mockOrderCreatedEvent)
      ).rejects.toThrow('Email service error');
    });

    it('should handle multiple items correctly', async () => {
      const eventWithMultipleItems = {
        ...mockOrderCreatedEvent,
        items: [
          mockOrderItem,
          { ...mockOrderItem, productName: 'Product 2', sku: 'SKU-002' },
          { ...mockOrderItem, productName: 'Product 3', sku: 'SKU-003' },
        ],
      };

      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );

      await (listener as any).handleOrderCreated(eventWithMultipleItems);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ productName: 'Test Product' }),
            expect.objectContaining({ productName: 'Product 2' }),
            expect.objectContaining({ productName: 'Product 3' }),
          ]),
        })
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete order lifecycle', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );
      orderNotificationService.notifyOrderShipped!.mockResolvedValue(undefined);
      orderNotificationService.notifyOrderDelivered!.mockResolvedValue(
        undefined
      );

      // Order created
      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);
      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalled();

      // Order shipped
      await (listener as any).handleOrderShipped(mockOrderStatusChangeEvent);
      expect(orderNotificationService.notifyOrderShipped).toHaveBeenCalled();

      // Order delivered
      const deliveredEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.DELIVERED,
      };
      await (listener as any).handleOrderDelivered(deliveredEvent);
      expect(orderNotificationService.notifyOrderDelivered).toHaveBeenCalled();
    });

    it('should handle order cancellation after creation', async () => {
      orderNotificationService.notifyOrderConfirmation!.mockResolvedValue(
        undefined
      );
      orderNotificationService.notifyOrderCancelled!.mockResolvedValue(
        undefined
      );

      // Order created
      await (listener as any).handleOrderCreated(mockOrderCreatedEvent);

      // Order cancelled
      const cancelledEvent = {
        ...mockOrderStatusChangeEvent,
        newStatus: OrderStatus.CANCELLED,
      };
      await (listener as any).handleOrderCancelled(cancelledEvent);

      expect(
        orderNotificationService.notifyOrderConfirmation
      ).toHaveBeenCalled();
      expect(orderNotificationService.notifyOrderCancelled).toHaveBeenCalled();
    });
  });
});
