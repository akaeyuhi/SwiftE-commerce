import { Test, TestingModule } from '@nestjs/testing';
import { InventoryNotificationService } from 'src/modules/infrastructure/notifications/inventory/inventory-notification.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Logger } from '@nestjs/common';
import { InventoryNotificationLog } from 'src/entities/infrastructure/notifications/inventory-notification-log.entity';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { EmailPriority } from 'src/common/enums/email.enum';
import {
  LowStockNotificationData,
  OutOfStockNotificationData,
} from 'src/common/interfaces/notifications/inventory-notification.types';
import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';
import { createMock, MockedMethods } from '../../utils/helpers';

describe('InventoryNotificationService', () => {
  let service: InventoryNotificationService;
  let notificationLogRepo: Partial<
    MockedMethods<Repository<InventoryNotificationLog>>
  >;
  let emailQueueService: Partial<MockedMethods<EmailQueueService>>;

  const mockLowStockData: LowStockNotificationData = {
    productName: 'Test Product',
    sku: 'TEST-SKU-001',
    category: 'Electronics',
    currentStock: 5,
    threshold: 10,
    recentSales: 15,
    estimatedDays: 3,
    storeId: 's1',
    productId: 'p1',
    variantId: 'v1',
    storeName: 'Test Store',
    inventoryManagementUrl: 'https://example.com/inventory',
    isCritical: false,
  };

  const mockOutOfStockData: OutOfStockNotificationData = {
    productName: 'Test Product',
    sku: 'TEST-SKU-001',
    category: 'Electronics',
    storeId: 's1',
    productId: 'p1',
    variantId: 'v1',
    storeName: 'Test Store',
    inventoryManagementUrl: 'https://example.com/inventory',
  };

  const mockLog: InventoryNotificationLog = {
    id: 'log-1',
    storeId: 's1',
    variantId: 'v1',
    productId: 'p1',
    recipient: 'admin@example.com',
    channel: NotificationChannel.EMAIL,
    notificationType: NotificationType.INVENTORY_LOW_STOCK,
    status: NotificationStatus.PENDING,
    payload: mockLowStockData,
    metadata: {},
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InventoryNotificationLog;

  beforeEach(async () => {
    notificationLogRepo = createMock<Repository<InventoryNotificationLog>>([
      'create',
      'save',
      'update',
      'find',
      'findOne',
    ]);

    emailQueueService = createMock<EmailQueueService>(['sendLowStockWarning']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryNotificationService,
        {
          provide: getRepositoryToken(InventoryNotificationLog),
          useValue: notificationLogRepo,
        },
        { provide: EmailQueueService, useValue: emailQueueService },
      ],
    }).compile();

    service = module.get<InventoryNotificationService>(
      InventoryNotificationService
    );

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
      expect(service).toBeInstanceOf(InventoryNotificationService);
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
    it('should send low stock notification via email queue', async () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        recipientName: 'Admin',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      emailQueueService.sendLowStockWarning!.mockResolvedValue(
        undefined as any
      );

      await (service as any).send(payload);

      expect(emailQueueService.sendLowStockWarning).toHaveBeenCalledWith(
        'admin@example.com',
        'Admin',
        {
          name: 'Test Product',
          sku: 'TEST-SKU-001',
          category: 'Electronics',
          currentStock: 5,
          threshold: 10,
          recentSales: 15,
          estimatedDays: 3,
        },
        'https://example.com/inventory',
        { priority: EmailPriority.HIGH }
      );
    });

    it('should send out of stock notification with urgent priority', async () => {
      const payload: NotificationPayload<OutOfStockNotificationData> = {
        recipient: 'admin@example.com',
        recipientName: 'Admin',
        notificationType: NotificationType.INVENTORY_OUT_OF_STOCK,
        data: mockOutOfStockData,
      };

      emailQueueService.sendLowStockWarning!.mockResolvedValue(
        undefined as any
      );

      await (service as any).send(payload);

      expect(emailQueueService.sendLowStockWarning).toHaveBeenCalledWith(
        'admin@example.com',
        'admin@example.com',
        {
          name: 'Test Product',
          sku: 'TEST-SKU-001',
          category: 'Electronics',
          currentStock: 0,
          threshold: 0,
          recentSales: 0,
          estimatedDays: 0,
        },
        'https://example.com/inventory',
        { priority: EmailPriority.URGENT }
      );
    });

    it('should use urgent priority for critical low stock', async () => {
      const criticalData = { ...mockLowStockData, isCritical: true };
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        recipientName: 'Admin',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: criticalData,
      };

      emailQueueService.sendLowStockWarning!.mockResolvedValue(
        undefined as any
      );

      await (service as any).send(payload);

      expect(emailQueueService.sendLowStockWarning).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        { priority: EmailPriority.URGENT }
      );
    });

    it('should throw error for unknown notification type', async () => {
      const payload: NotificationPayload<any> = {
        recipient: 'admin@example.com',
        notificationType: 'UNKNOWN_TYPE' as any,
        data: mockLowStockData,
      };

      await expect((service as any).send(payload)).rejects.toThrow(
        'Unknown notification type'
      );
    });
  });

  describe('validatePayload', () => {
    it('should validate valid low stock payload', () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      expect(() => (service as any).validatePayload(payload)).not.toThrow();
    });

    it('should validate valid out of stock payload', () => {
      const payload: NotificationPayload<OutOfStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_OUT_OF_STOCK,
        data: mockOutOfStockData,
      };

      expect(() => (service as any).validatePayload(payload)).not.toThrow();
    });

    it('should throw error for invalid email', () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'invalid-email',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid email address'
      );
    });

    it('should throw error for missing recipient', () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: '',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid email address'
      );
    });

    it('should throw error for invalid notification type', () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: 'INVALID_TYPE' as any,
        data: mockLowStockData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid notification type'
      );
    });

    it('should throw error for missing data', () => {
      const payload: NotificationPayload<any> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: null,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Notification data is required'
      );
    });

    it('should throw error for missing required fields', () => {
      const payload: NotificationPayload<any> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: { sku: 'TEST' },
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Missing required fields'
      );
    });

    it('should throw error for low stock missing currentStock', () => {
      const invalidData = { ...mockLowStockData };
      delete (invalidData as any).currentStock;

      const payload: NotificationPayload<any> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: invalidData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Low stock notification missing currentStock or threshold'
      );
    });

    it('should throw error for low stock missing threshold', () => {
      const invalidData = { ...mockLowStockData };
      delete (invalidData as any).threshold;

      const payload: NotificationPayload<any> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: invalidData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Low stock notification missing currentStock or threshold'
      );
    });
  });

  describe('createLog', () => {
    it('should create notification log entry', async () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);

      const result = await (service as any).createLog(payload);

      expect(notificationLogRepo.create).toHaveBeenCalledWith({
        storeId: 's1',
        variantId: 'v1',
        productId: 'p1',
        recipient: 'admin@example.com',
        channel: NotificationChannel.EMAIL,
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        status: NotificationStatus.PENDING,
        payload: mockLowStockData,
        metadata: {},
        retryCount: 0,
      });
      expect(notificationLogRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockLog);
    });

    it('should include metadata when provided', async () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
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

    it('should update with metadata', async () => {
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await (service as any).updateLog('log-1', NotificationStatus.PENDING, {
        scheduled: true,
      });

      expect(notificationLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          metadata: { scheduled: true },
        })
      );
    });

    it('should update with error message', async () => {
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await (service as any).updateLog(
        'log-1',
        NotificationStatus.FAILED,
        undefined,
        'Email service error'
      );

      expect(notificationLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          errorMessage: 'Email service error',
        })
      );
    });

    it('should set sentAt when status is SENT', async () => {
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await (service as any).updateLog('log-1', NotificationStatus.SENT);

      expect(notificationLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          sentAt: expect.any(Date),
        })
      );
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
      const scheduledFor = new Date(Date.now() + 60000); // 1 minute from now
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      const logId = await service.scheduleNotification(payload, scheduledFor);

      expect(logId).toBe('log-1');
      expect(notificationLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            scheduledFor: scheduledFor.toISOString(),
          }),
        })
      );
    });

    it('should validate payload before scheduling', async () => {
      const scheduledFor = new Date(Date.now() + 60000);
      const invalidPayload: NotificationPayload<any> = {
        recipient: 'invalid-email',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      await expect(
        service.scheduleNotification(invalidPayload, scheduledFor)
      ).rejects.toThrow('Invalid email address');
    });

    it('should handle scheduling errors', async () => {
      const scheduledFor = new Date(Date.now() + 60000);
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);
      notificationLogRepo.update!.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.scheduleNotification(payload, scheduledFor)
      ).rejects.toThrow('Update failed');

      expect(notificationLogRepo.update).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          status: NotificationStatus.FAILED,
        })
      );
    });

    it('should log scheduling confirmation', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const scheduledFor = new Date(Date.now() + 60000);
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await service.scheduleNotification(payload, scheduledFor);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled')
      );
    });
  });

  describe('notifyLowStock', () => {
    it('should send low stock notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyLowStock(
        'admin@example.com',
        'Admin',
        mockLowStockData
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'admin@example.com',
        recipientName: 'Admin',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
        metadata: {
          sentAt: expect.any(String),
          severity: 'warning',
        },
      });
    });

    it('should mark critical alerts in metadata', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);
      const criticalData = { ...mockLowStockData, isCritical: true };

      await service.notifyLowStock('admin@example.com', 'Admin', criticalData);

      expect(service.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'critical',
          }),
        })
      );
    });
  });

  describe('notifyOutOfStock', () => {
    it('should send out of stock notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOutOfStock(
        'admin@example.com',
        'Admin',
        mockOutOfStockData
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'admin@example.com',
        recipientName: 'Admin',
        notificationType: NotificationType.INVENTORY_OUT_OF_STOCK,
        data: mockOutOfStockData,
        metadata: {
          sentAt: expect.any(String),
          severity: 'critical',
        },
      });
    });

    it('should always mark as critical', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyOutOfStock(
        'admin@example.com',
        'Admin',
        mockOutOfStockData
      );

      expect(service.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            severity: 'critical',
          }),
        })
      );
    });
  });

  describe('getStoreNotificationStats', () => {
    it('should return notification statistics', async () => {
      const logs = [
        { ...mockLog, status: NotificationStatus.SENT },
        { ...mockLog, id: 'log-2', status: NotificationStatus.FAILED },
        { ...mockLog, id: 'log-3', status: NotificationStatus.PENDING },
        {
          ...mockLog,
          id: 'log-4',
          notificationType: NotificationType.INVENTORY_OUT_OF_STOCK,
          status: NotificationStatus.SENT,
        },
      ];

      notificationLogRepo.find!.mockResolvedValue(logs);

      const stats = await service.getStoreNotificationStats(
        's1',
        new Date('2025-01-01')
      );

      expect(stats.total).toBe(4);
      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.byType[NotificationType.INVENTORY_LOW_STOCK]).toBe(3);
      expect(stats.byType[NotificationType.INVENTORY_OUT_OF_STOCK]).toBe(1);
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

    it('should return empty stats for no logs', async () => {
      notificationLogRepo.find!.mockResolvedValue([]);

      const stats = await service.getStoreNotificationStats('s1', new Date());

      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect((service as any).isValidEmail('user@example.com')).toBe(true);
      expect((service as any).isValidEmail('test.user@example.co.uk')).toBe(
        true
      );
      expect((service as any).isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect((service as any).isValidEmail('invalid')).toBe(false);
      expect((service as any).isValidEmail('invalid@')).toBe(false);
      expect((service as any).isValidEmail('@example.com')).toBe(false);
      expect((service as any).isValidEmail('user@')).toBe(false);
      expect((service as any).isValidEmail('')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle email queue errors', async () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      emailQueueService.sendLowStockWarning!.mockRejectedValue(
        new Error('Email service down')
      );

      await expect((service as any).send(payload)).rejects.toThrow(
        'Email service down'
      );
    });

    it('should handle repository errors', async () => {
      const payload: NotificationPayload<LowStockNotificationData> = {
        recipient: 'admin@example.com',
        notificationType: NotificationType.INVENTORY_LOW_STOCK,
        data: mockLowStockData,
      };

      notificationLogRepo.save!.mockRejectedValue(new Error('Database error'));

      await expect((service as any).createLog(payload)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete notification flow', async () => {
      jest.spyOn(service as any, 'validatePayload').mockImplementation();
      jest.spyOn(service as any, 'createLog').mockResolvedValue(mockLog);
      jest.spyOn(service as any, 'send').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'updateLog').mockResolvedValue(undefined);

      await service.notifyLowStock(
        'admin@example.com',
        'Admin',
        mockLowStockData
      );

      expect((service as any).validatePayload).toHaveBeenCalled();
      expect((service as any).createLog).toHaveBeenCalled();
      expect((service as any).send).toHaveBeenCalled();
    });
  });
});
