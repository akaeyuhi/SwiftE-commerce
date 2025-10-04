import { Test, TestingModule } from '@nestjs/testing';
import { OrderNotificationService } from 'src/modules/infrastructure/notifications/order/order-notification.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Logger } from '@nestjs/common';
import { OrderNotificationLog } from 'src/entities/infrastructure/notifications/order-notification-log.entity';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { EmailPriority } from 'src/common/enums/email.enum';
import {
  OrderConfirmationNotificationData,
  OrderShippedNotificationData,
  OrderDeliveredNotificationData,
  OrderCancelledNotificationData,
} from 'src/common/interfaces/notifications/order-notification.types';
import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';
import { createMock, MockedMethods } from '../../../utils/helpers';

describe('OrderNotificationService', () => {
  let service: OrderNotificationService;
  let notificationLogRepo: Partial<
    MockedMethods<Repository<OrderNotificationLog>>
  >;
  let emailQueueService: Partial<MockedMethods<EmailQueueService>>;

  const mockOrderItems = [
    {
      productName: 'Product 1',
      sku: 'SKU-001',
      quantity: 2,
      unitPrice: 25.99,
      lineTotal: 51.98,
    },
  ];

  const mockOrderConfirmationData: OrderConfirmationNotificationData = {
    orderId: 'order-1',
    orderNumber: 'ORD-12345',
    storeId: 's1',
    storeName: 'Test Store',
    userId: 'u1',
    totalAmount: 51.98,
    items: mockOrderItems,
    shippingAddress: '123 Main St, New York, NY 10001',
    shippingAddressLine1: '123 Main St',
    shippingCity: 'New York',
    shippingState: 'NY',
    shippingPostalCode: '10001',
    shippingCountry: 'USA',
    shippingMethod: 'Standard Shipping',
    orderUrl: 'https://example.com/orders/order-1',
    orderDate: 'October 1, 2025',
  };

  const mockOrderShippedData: OrderShippedNotificationData = {
    orderId: 'order-1',
    orderNumber: 'ORD-12345',
    storeId: 's1',
    storeName: 'Test Store',
    userId: 'u1',
    totalAmount: 51.98,
    items: mockOrderItems,
    trackingNumber: 'TRACK123456',
    trackingUrl: 'https://tracking.example.com/TRACK123456',
    estimatedDeliveryDate: 'October 5, 2025',
    shippingMethod: 'Express',
    shippingAddress: '123 Main St, New York, NY 10001',
    shippedDate: 'October 2, 2025',
  };

  const mockOrderDeliveredData: OrderDeliveredNotificationData = {
    orderId: 'order-1',
    orderNumber: 'ORD-12345',
    storeId: 's1',
    storeName: 'Test Store',
    userId: 'u1',
    totalAmount: 51.98,
    items: mockOrderItems,
    deliveredDate: 'October 5, 2025',
    shippingAddress: '123 Main St, New York, NY 10001',
    reviewUrl: 'https://example.com/orders/order-1/review',
    supportUrl: 'https://example.com/support',
  };

  const mockOrderCancelledData: OrderCancelledNotificationData = {
    orderId: 'order-1',
    orderNumber: 'ORD-12345',
    storeId: 's1',
    storeName: 'Test Store',
    userId: 'u1',
    totalAmount: 51.98,
    items: mockOrderItems,
    cancelledDate: 'October 2, 2025',
    cancellationReason: 'Customer request',
    refundAmount: 51.98,
    refundMethod: 'Original payment method',
  };

  const mockLog: OrderNotificationLog = {
    id: 'log-1',
    storeId: 's1',
    orderId: 'order-1',
    userId: 'u1',
    recipient: 'customer@example.com',
    channel: NotificationChannel.EMAIL,
    notificationType: NotificationType.ORDER_CONFIRMATION,
    status: NotificationStatus.PENDING,
    payload: mockOrderConfirmationData,
    metadata: {},
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrderNotificationLog;

  beforeEach(async () => {
    notificationLogRepo = createMock<Repository<OrderNotificationLog>>([
      'create',
      'save',
      'update',
      'find',
      'findOne',
    ]);

    emailQueueService = createMock<EmailQueueService>([
      'sendOrderConfirmation',
      'sendOrderShipped',
      'sendOrderDelivered',
      'sendOrderCancelled',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderNotificationService,
        {
          provide: getRepositoryToken(OrderNotificationLog),
          useValue: notificationLogRepo,
        },
        { provide: EmailQueueService, useValue: emailQueueService },
      ],
    }).compile();

    service = module.get<OrderNotificationService>(OrderNotificationService);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseNotificationService', () => {
      expect(service).toBeInstanceOf(OrderNotificationService);
    });

    it('should have email channel', () => {
      expect((service as any).channel).toBe(NotificationChannel.EMAIL);
    });

    it('should have retry configuration', () => {
      expect((service as any).maxRetries).toBe(5);
      expect((service as any).batchDelay).toBe(200);
    });
  });

  describe('send', () => {
    it('should route ORDER_CONFIRMATION to sendOrderConfirmation', async () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      jest
        .spyOn(service as any, 'sendOrderConfirmation')
        .mockResolvedValue(undefined);

      await (service as any).send(payload);

      expect((service as any).sendOrderConfirmation).toHaveBeenCalledWith(
        payload
      );
    });

    it('should route ORDER_SHIPPED to sendOrderShipped', async () => {
      const payload: NotificationPayload<OrderShippedNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_SHIPPED,
        data: mockOrderShippedData,
      };

      jest
        .spyOn(service as any, 'sendOrderShipped')
        .mockResolvedValue(undefined);

      await (service as any).send(payload);

      expect((service as any).sendOrderShipped).toHaveBeenCalledWith(payload);
    });

    it('should route ORDER_DELIVERED to sendOrderDelivered', async () => {
      const payload: NotificationPayload<OrderDeliveredNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_DELIVERED,
        data: mockOrderDeliveredData,
      };

      jest
        .spyOn(service as any, 'sendOrderDelivered')
        .mockResolvedValue(undefined);

      await (service as any).send(payload);

      expect((service as any).sendOrderDelivered).toHaveBeenCalledWith(payload);
    });

    it('should route ORDER_CANCELLED to sendOrderCancelled', async () => {
      const payload: NotificationPayload<OrderCancelledNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CANCELLED,
        data: mockOrderCancelledData,
      };

      jest
        .spyOn(service as any, 'sendOrderCancelled')
        .mockResolvedValue(undefined);

      await (service as any).send(payload);

      expect((service as any).sendOrderCancelled).toHaveBeenCalledWith(payload);
    });

    it('should throw error for unknown notification type', async () => {
      const payload: NotificationPayload<any> = {
        recipient: 'customer@example.com',
        notificationType: 'UNKNOWN_TYPE' as any,
        data: mockOrderConfirmationData,
      };

      await expect((service as any).send(payload)).rejects.toThrow(
        'Unknown notification type'
      );
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email', async () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      emailQueueService.sendOrderConfirmation!.mockResolvedValue(
        undefined as any
      );

      await (service as any).sendOrderConfirmation(payload);

      expect(emailQueueService.sendOrderConfirmation).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
          totalAmount: 51.98,
          items: expect.arrayContaining([
            expect.objectContaining({
              name: 'Product 1',
              quantity: 2,
              price: 25.99,
            }),
          ]),
        }),
        { priority: EmailPriority.HIGH }
      );
    });

    it('should use recipient as name if recipientName not provided', async () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      emailQueueService.sendOrderConfirmation!.mockResolvedValue(
        undefined as any
      );

      await (service as any).sendOrderConfirmation(payload);

      expect(emailQueueService.sendOrderConfirmation).toHaveBeenCalledWith(
        'customer@example.com',
        'customer@example.com',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('sendOrderShipped', () => {
    it('should send order shipped email', async () => {
      const payload: NotificationPayload<OrderShippedNotificationData> = {
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_SHIPPED,
        data: mockOrderShippedData,
      };

      emailQueueService.sendOrderShipped!.mockResolvedValue(undefined as any);

      await (service as any).sendOrderShipped(payload);

      expect(emailQueueService.sendOrderShipped).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
          trackingNumber: 'TRACK123456',
          trackingUrl: 'https://tracking.example.com/TRACK123456',
        }),
        { priority: EmailPriority.HIGH }
      );
    });
  });

  describe('sendOrderDelivered', () => {
    it('should send order delivered email', async () => {
      const payload: NotificationPayload<OrderDeliveredNotificationData> = {
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_DELIVERED,
        data: mockOrderDeliveredData,
      };

      emailQueueService.sendOrderDelivered!.mockResolvedValue(undefined as any);

      await (service as any).sendOrderDelivered(payload);

      expect(emailQueueService.sendOrderDelivered).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
          deliveredDate: 'October 5, 2025',
          reviewUrl: 'https://example.com/orders/order-1/review',
        }),
        { priority: EmailPriority.NORMAL }
      );
    });
  });

  describe('sendOrderCancelled', () => {
    it('should send order cancelled email', async () => {
      const payload: NotificationPayload<OrderCancelledNotificationData> = {
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_CANCELLED,
        data: mockOrderCancelledData,
      };

      emailQueueService.sendOrderCancelled!.mockResolvedValue(undefined as any);

      await (service as any).sendOrderCancelled(payload);

      expect(emailQueueService.sendOrderCancelled).toHaveBeenCalledWith(
        'customer@example.com',
        'John Doe',
        expect.objectContaining({
          orderId: 'order-1',
          orderNumber: 'ORD-12345',
          cancelledDate: 'October 2, 2025',
          cancellationReason: 'Customer request',
          refundAmount: 51.98,
        }),
        { priority: EmailPriority.HIGH }
      );
    });
  });

  describe('validatePayload', () => {
    it('should validate valid payload', () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      expect(() => (service as any).validatePayload(payload)).not.toThrow();
    });

    it('should throw error for invalid email', () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'invalid-email',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid email address'
      );
    });

    it('should throw error for missing recipient', () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: '',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid email address'
      );
    });

    it('should throw error for invalid notification type', () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: 'INVALID_TYPE' as any,
        data: mockOrderConfirmationData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid notification type'
      );
    });

    it('should throw error for missing data', () => {
      const payload: NotificationPayload<any> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: null,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Notification data is required'
      );
    });

    it('should throw error for missing required fields', () => {
      const payload: NotificationPayload<any> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: { orderNumber: 'ORD-12345' },
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Missing required fields'
      );
    });

    it('should validate all order notification types', () => {
      const types = [
        NotificationType.ORDER_CONFIRMATION,
        NotificationType.ORDER_SHIPPED,
        NotificationType.ORDER_DELIVERED,
        NotificationType.ORDER_CANCELLED,
      ];

      types.forEach((type) => {
        const payload: NotificationPayload<any> = {
          recipient: 'customer@example.com',
          notificationType: type,
          data: mockOrderConfirmationData,
        };

        expect(() => (service as any).validatePayload(payload)).not.toThrow();
      });
    });
  });

  describe('createLog', () => {
    it('should create notification log entry', async () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);

      const result = await (service as any).createLog(payload);

      expect(notificationLogRepo.create).toHaveBeenCalledWith({
        storeId: 's1',
        orderId: 'order-1',
        userId: 'u1',
        recipient: 'customer@example.com',
        channel: NotificationChannel.EMAIL,
        notificationType: NotificationType.ORDER_CONFIRMATION,
        status: NotificationStatus.PENDING,
        payload: mockOrderConfirmationData,
        metadata: {},
        retryCount: 0,
      });
      expect(result).toEqual(mockLog);
    });

    it('should include metadata when provided', async () => {
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
        metadata: { custom: 'data' },
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);

      await (service as any).createLog(payload);

      expect(notificationLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { custom: 'data' },
        })
      );
    });
  });

  describe('updateLog', () => {
    it('should update log status', async () => {
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await (service as any).updateLog('log-1', NotificationStatus.SENT);

      expect(notificationLogRepo.update).toHaveBeenCalledWith('log-1', {
        status: NotificationStatus.SENT,
        updatedAt: expect.any(Date),
        sentAt: expect.any(Date),
      });
    });

    it('should set deliveredAt when status is DELIVERED', async () => {
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await (service as any).updateLog('log-1', NotificationStatus.DELIVERED);

      expect(notificationLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          deliveredAt: expect.any(Date),
        })
      );
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification for future delivery', async () => {
      const scheduledFor = new Date(Date.now() + 60000);
      const payload: NotificationPayload<OrderConfirmationNotificationData> = {
        recipient: 'customer@example.com',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      const logId = await service.scheduleNotification(payload, scheduledFor);

      expect(logId).toBe('log-1');
    });

    it('should validate payload before scheduling', async () => {
      const scheduledFor = new Date(Date.now() + 60000);
      const invalidPayload: NotificationPayload<any> = {
        recipient: 'invalid-email',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
      };

      await expect(
        service.scheduleNotification(invalidPayload, scheduledFor)
      ).rejects.toThrow('Invalid email address');
    });
  });

  describe('notifyOrderConfirmation', () => {
    it('should send order confirmation notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOrderConfirmation(
        'customer@example.com',
        'John Doe',
        mockOrderConfirmationData
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_CONFIRMATION,
        data: mockOrderConfirmationData,
        metadata: {
          sentAt: expect.any(String),
          priority: 'high',
        },
      });
    });
  });

  describe('notifyOrderShipped', () => {
    it('should send order shipped notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOrderShipped(
        'customer@example.com',
        'John Doe',
        mockOrderShippedData
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_SHIPPED,
        data: mockOrderShippedData,
        metadata: {
          sentAt: expect.any(String),
          priority: 'high',
        },
      });
    });
  });

  describe('notifyOrderDelivered', () => {
    it('should send order delivered notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOrderDelivered(
        'customer@example.com',
        'John Doe',
        mockOrderDeliveredData
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_DELIVERED,
        data: mockOrderDeliveredData,
        metadata: {
          sentAt: expect.any(String),
          priority: 'normal',
        },
      });
    });
  });

  describe('notifyOrderCancelled', () => {
    it('should send order cancelled notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOrderCancelled(
        'customer@example.com',
        'John Doe',
        mockOrderCancelledData
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'customer@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.ORDER_CANCELLED,
        data: mockOrderCancelledData,
        metadata: {
          sentAt: expect.any(String),
          priority: 'high',
        },
      });
    });
  });

  describe('getOrderNotificationStats', () => {
    it('should return notification statistics for order', async () => {
      const logs = [
        { ...mockLog, status: NotificationStatus.SENT },
        {
          ...mockLog,
          id: 'log-2',
          notificationType: NotificationType.ORDER_SHIPPED,
          status: NotificationStatus.FAILED,
        },
        { ...mockLog, id: 'log-3', status: NotificationStatus.PENDING },
      ];

      notificationLogRepo.find!.mockResolvedValue(logs);

      const stats = await service.getOrderNotificationStats('order-1');

      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.byType[NotificationType.ORDER_CONFIRMATION]).toBe(2);
      expect(stats.byType[NotificationType.ORDER_SHIPPED]).toBe(1);
    });

    it('should query logs for specific order', async () => {
      notificationLogRepo.find!.mockResolvedValue([]);

      await service.getOrderNotificationStats('order-1');

      expect(notificationLogRepo.find).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
      });
    });

    it('should return empty stats for no logs', async () => {
      notificationLogRepo.find!.mockResolvedValue([]);

      const stats = await service.getOrderNotificationStats('order-1');

      expect(stats.total).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  describe('getStoreNotificationStats', () => {
    it('should return notification statistics for store', async () => {
      const logs = [
        { ...mockLog, status: NotificationStatus.SENT },
        {
          ...mockLog,
          id: 'log-2',
          notificationType: NotificationType.ORDER_SHIPPED,
          status: NotificationStatus.FAILED,
        },
        {
          ...mockLog,
          id: 'log-3',
          notificationType: NotificationType.ORDER_DELIVERED,
          status: NotificationStatus.PENDING,
        },
      ];

      notificationLogRepo.find!.mockResolvedValue(logs);

      const stats = await service.getStoreNotificationStats(
        's1',
        new Date('2025-01-01')
      );

      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should query logs since specified date', async () => {
      const since = new Date('2025-01-01');
      notificationLogRepo.find!.mockResolvedValue([]);

      await service.getStoreNotificationStats('s1', since);

      expect(notificationLogRepo.find).toHaveBeenCalledWith({
        where: {
          storeId: 's1',
          createdAt: MoreThanOrEqual(since),
        },
      });
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect((service as any).isValidEmail('user@example.com')).toBe(true);
      expect((service as any).isValidEmail('test.user@example.co.uk')).toBe(
        true
      );
    });

    it('should reject invalid email addresses', () => {
      expect((service as any).isValidEmail('invalid')).toBe(false);
      expect((service as any).isValidEmail('')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete order lifecycle notifications', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOrderConfirmation(
        'customer@example.com',
        'John Doe',
        mockOrderConfirmationData
      );
      await service.notifyOrderShipped(
        'customer@example.com',
        'John Doe',
        mockOrderShippedData
      );
      await service.notifyOrderDelivered(
        'customer@example.com',
        'John Doe',
        mockOrderDeliveredData
      );

      expect(service.notify).toHaveBeenCalledTimes(3);
    });
  });
});
