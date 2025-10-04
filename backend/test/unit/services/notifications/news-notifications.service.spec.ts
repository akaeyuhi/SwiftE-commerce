import { Test, TestingModule } from '@nestjs/testing';
import { NewsNotificationService } from 'src/modules/infrastructure/notifications/news/news-notification.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Logger } from '@nestjs/common';
import { NewsNotificationLog } from 'src/entities/infrastructure/notifications/news-notification-log.entity';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/common/enums/notification.enum';
import { EmailPriority } from 'src/common/enums/email.enum';
import { NewsNotificationData } from 'src/common/interfaces/notifications/news-notification.types';
import { NotificationPayload } from 'src/common/interfaces/infrastructure/notification.interface';
import { createMock, MockedMethods } from '../../../utils/helpers';

describe('NewsNotificationService', () => {
  let service: NewsNotificationService;
  let notificationLogRepo: Partial<
    MockedMethods<Repository<NewsNotificationLog>>
  >;
  let emailQueueService: Partial<MockedMethods<EmailQueueService>>;

  const mockNewsData: NewsNotificationData = {
    newsId: 'news-1',
    storeId: 's1',
    storeName: 'Test Store',
    title: 'Breaking News: New Product Launch',
    content: 'We are excited to announce...',
    excerpt: 'Exciting announcement',
    authorName: 'Store Admin',
    publishedAt: 'October 1, 2025',
    newsUrl: 'https://example.com/news/news-1',
    coverImageUrl: 'https://example.com/images/cover.jpg',
    category: 'announcements',
    unsubscribeUrl: 'https://example.com/unsubscribe',
  };

  const mockLog: NewsNotificationLog = {
    id: 'log-1',
    storeId: 's1',
    newsId: 'news-1',
    userId: 'u1',
    recipient: 'user@example.com',
    channel: NotificationChannel.EMAIL,
    notificationType: NotificationType.NEWS_PUBLISHED,
    status: NotificationStatus.PENDING,
    payload: mockNewsData,
    metadata: {},
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NewsNotificationLog;

  beforeEach(async () => {
    notificationLogRepo = createMock<Repository<NewsNotificationLog>>([
      'create',
      'save',
      'update',
      'find',
      'findOne',
    ]);

    emailQueueService = createMock<EmailQueueService>(['sendNewsNotification']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsNotificationService,
        {
          provide: getRepositoryToken(NewsNotificationLog),
          useValue: notificationLogRepo,
        },
        { provide: EmailQueueService, useValue: emailQueueService },
      ],
    }).compile();

    service = module.get<NewsNotificationService>(NewsNotificationService);

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
      expect(service).toBeInstanceOf(NewsNotificationService);
    });

    it('should have email channel', () => {
      expect((service as any).channel).toBe(NotificationChannel.EMAIL);
    });

    it('should have retry configuration', () => {
      expect((service as any).maxRetries).toBe(3);
      expect((service as any).batchDelay).toBe(300);
    });
  });

  describe('send', () => {
    it('should send news notification via email queue', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      emailQueueService.sendNewsNotification!.mockResolvedValue(
        undefined as any
      );

      await (service as any).send(payload);

      expect(emailQueueService.sendNewsNotification).toHaveBeenCalledWith(
        'user@example.com',
        'John Doe',
        {
          newsId: 'news-1',
          title: 'Breaking News: New Product Launch',
          excerpt: 'Exciting announcement',
          content: 'We are excited to announce...',
          authorName: 'Store Admin',
          publishedAt: 'October 1, 2025',
          newsUrl: 'https://example.com/news/news-1',
          coverImageUrl: 'https://example.com/images/cover.jpg',
          category: 'announcements',
          storeName: 'Test Store',
          unsubscribeUrl: 'https://example.com/unsubscribe',
        },
        { priority: EmailPriority.NORMAL }
      );
    });

    it('should use recipient email as name if recipientName not provided', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      emailQueueService.sendNewsNotification!.mockResolvedValue(
        undefined as any
      );

      await (service as any).send(payload);

      expect(emailQueueService.sendNewsNotification).toHaveBeenCalledWith(
        'user@example.com',
        'user@example.com',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle email queue errors', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      emailQueueService.sendNewsNotification!.mockRejectedValue(
        new Error('Email service error')
      );

      await expect((service as any).send(payload)).rejects.toThrow(
        'Email service error'
      );
    });
  });

  describe('validatePayload', () => {
    it('should validate valid payload', () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      expect(() => (service as any).validatePayload(payload)).not.toThrow();
    });

    it('should throw error for invalid email', () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'invalid-email',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid email address'
      );
    });

    it('should throw error for missing recipient', () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: '',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid email address'
      );
    });

    it('should throw error for invalid notification type', () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: 'INVALID_TYPE' as any,
        data: mockNewsData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Invalid notification type'
      );
    });

    it('should throw error for missing data', () => {
      const payload: NotificationPayload<any> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: null,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Notification data is required'
      );
    });

    it('should throw error for missing required fields', () => {
      const payload: NotificationPayload<any> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: { title: 'Test' },
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Missing required fields'
      );
    });

    it('should throw error for missing newsId', () => {
      const invalidData = { ...mockNewsData };
      delete (invalidData as any).newsId;

      const payload: NotificationPayload<any> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: invalidData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Missing required fields'
      );
    });

    it('should throw error for missing storeId', () => {
      const invalidData = { ...mockNewsData };
      delete (invalidData as any).storeId;

      const payload: NotificationPayload<any> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: invalidData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Missing required fields'
      );
    });

    it('should throw error for missing title', () => {
      const invalidData = { ...mockNewsData };
      delete (invalidData as any).title;

      const payload: NotificationPayload<any> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: invalidData,
      };

      expect(() => (service as any).validatePayload(payload)).toThrow(
        'Missing required fields'
      );
    });
  });

  describe('createLog', () => {
    it('should create notification log entry', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);

      const result = await (service as any).createLog(payload);

      expect(notificationLogRepo.create).toHaveBeenCalledWith({
        storeId: 's1',
        newsId: 'news-1',
        userId: null,
        recipient: 'user@example.com',
        channel: NotificationChannel.EMAIL,
        notificationType: NotificationType.NEWS_PUBLISHED,
        status: NotificationStatus.PENDING,
        payload: mockNewsData,
        metadata: {},
        retryCount: 0,
      });
      expect(notificationLogRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockLog);
    });

    it('should include userId from metadata when provided', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
        metadata: { userId: 'u1' },
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);

      await (service as any).createLog(payload);

      expect(notificationLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
        })
      );
    });

    it('should include metadata when provided', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
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
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
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
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      await expect(
        service.scheduleNotification(invalidPayload, scheduledFor)
      ).rejects.toThrow('Invalid email address');
    });

    it('should handle scheduling errors', async () => {
      const scheduledFor = new Date(Date.now() + 60000);
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
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
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      notificationLogRepo.create!.mockReturnValue(mockLog);
      notificationLogRepo.save!.mockResolvedValue(mockLog);
      notificationLogRepo.update!.mockResolvedValue({ affected: 1 } as any);

      await service.scheduleNotification(payload, scheduledFor);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled news notification')
      );
    });
  });

  describe('notifyNewsPublished', () => {
    it('should send news published notification', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyNewsPublished(
        'user@example.com',
        'John Doe',
        mockNewsData,
        'u1'
      );

      expect(service.notify).toHaveBeenCalledWith({
        recipient: 'user@example.com',
        recipientName: 'John Doe',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
        metadata: {
          sentAt: expect.any(String),
          userId: 'u1',
        },
      });
    });

    it('should handle notification without userId', async () => {
      jest.spyOn(service, 'notify').mockResolvedValue(undefined);

      await service.notifyNewsPublished(
        'user@example.com',
        'John Doe',
        mockNewsData
      );

      expect(service.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: undefined,
          }),
        })
      );
    });
  });

  describe('notifyFollowers', () => {
    const followers = [
      { email: 'user1@example.com', name: 'User 1', userId: 'u1' },
      { email: 'user2@example.com', name: 'User 2', userId: 'u2' },
      { email: 'user3@example.com', name: 'User 3' },
    ];

    it('should send notifications to multiple followers', async () => {
      jest
        .spyOn(service, 'notifyBatch')
        .mockResolvedValue([
          { success: true },
          { success: true },
          { success: true },
        ]);

      const results = await service.notifyFollowers(followers, mockNewsData);

      expect(results).toHaveLength(3);
      expect(service.notifyBatch).toHaveBeenCalled();
    });

    it('should generate unique unsubscribe URL for each follower', async () => {
      jest
        .spyOn(service, 'notifyBatch')
        .mockResolvedValue([
          { success: true },
          { success: true },
          { success: true },
        ]);

      await service.notifyFollowers(followers, mockNewsData);

      const call = (service.notifyBatch as jest.Mock).mock.calls[0][0];
      expect(call[0].data.unsubscribeUrl).toContain('user=u1');
      expect(call[1].data.unsubscribeUrl).toContain('user=u2');
      expect(call[2].data.unsubscribeUrl).toContain('user=user3%40example.com');
    });

    it('should include userId in metadata when provided', async () => {
      jest
        .spyOn(service, 'notifyBatch')
        .mockResolvedValue([{ success: true }, { success: true }]);

      await service.notifyFollowers(followers.slice(0, 2), mockNewsData);

      const call = (service.notifyBatch as jest.Mock).mock.calls[0][0];
      expect(call[0].metadata.userId).toBe('u1');
      expect(call[1].metadata.userId).toBe('u2');
    });

    it('should log batch notification', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      jest.spyOn(service, 'notifyBatch').mockResolvedValue([{ success: true }]);

      await service.notifyFollowers(followers, mockNewsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending news notification')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('to 3 followers')
      );
    });

    it('should handle empty followers array', async () => {
      jest.spyOn(service, 'notifyBatch').mockResolvedValue([]);

      const results = await service.notifyFollowers([], mockNewsData);

      expect(results).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      jest
        .spyOn(service, 'notifyBatch')
        .mockResolvedValue([
          { success: true },
          { success: false, error: 'Email failed' },
          { success: true },
        ]);

      const results = await service.notifyFollowers(followers, mockNewsData);

      expect(results.filter((r) => r.success)).toHaveLength(2);
      expect(results.filter((r) => !r.success)).toHaveLength(1);
    });
  });

  describe('getNewsNotificationStats', () => {
    it('should return notification statistics for news', async () => {
      const logs = [
        { ...mockLog, status: NotificationStatus.SENT },
        { ...mockLog, id: 'log-2', status: NotificationStatus.FAILED },
        { ...mockLog, id: 'log-3', status: NotificationStatus.PENDING },
      ];

      notificationLogRepo.find!.mockResolvedValue(logs);

      const stats = await service.getNewsNotificationStats('news-1');

      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should query logs for specific news', async () => {
      notificationLogRepo.find!.mockResolvedValue([]);

      await service.getNewsNotificationStats('news-1');

      expect(notificationLogRepo.find).toHaveBeenCalledWith({
        where: { newsId: 'news-1' },
      });
    });

    it('should return empty stats for no logs', async () => {
      notificationLogRepo.find!.mockResolvedValue([]);

      const stats = await service.getNewsNotificationStats('news-1');

      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('getStoreNotificationStats', () => {
    it('should return notification statistics for store', async () => {
      const logs = [
        {
          ...mockLog,
          recipient: 'user1@example.com',
          status: NotificationStatus.SENT,
        },
        {
          ...mockLog,
          id: 'log-2',
          recipient: 'user2@example.com',
          status: NotificationStatus.FAILED,
        },
        {
          ...mockLog,
          id: 'log-3',
          recipient: 'user1@example.com',
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
      expect(stats.uniqueRecipients).toBe(2);
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

    it('should count unique recipients correctly', async () => {
      const logs = [
        { ...mockLog, recipient: 'user1@example.com' },
        { ...mockLog, id: 'log-2', recipient: 'user1@example.com' },
        { ...mockLog, id: 'log-3', recipient: 'user2@example.com' },
        { ...mockLog, id: 'log-4', recipient: 'user3@example.com' },
      ];

      notificationLogRepo.find!.mockResolvedValue(logs);

      const stats = await service.getStoreNotificationStats('s1', new Date());

      expect(stats.uniqueRecipients).toBe(3);
    });

    it('should return empty stats for no logs', async () => {
      notificationLogRepo.find!.mockResolvedValue([]);

      const stats = await service.getStoreNotificationStats('s1', new Date());

      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.uniqueRecipients).toBe(0);
    });
  });

  describe('generateUnsubscribeUrl', () => {
    it('should generate unsubscribe URL with userId', () => {
      const url = (service as any).generateUnsubscribeUrl('s1', 'u1');

      expect(url).toContain('/stores/s1/unsubscribe');
      expect(url).toContain('user=u1');
    });

    it('should generate unsubscribe URL with email', () => {
      const url = (service as any).generateUnsubscribeUrl(
        's1',
        'user@example.com'
      );

      expect(url).toContain('/stores/s1/unsubscribe');
      expect(url).toContain('user=user%40example.com');
    });

    it('should encode special characters in user parameter', () => {
      const url = (service as any).generateUnsubscribeUrl(
        's1',
        'user+tag@example.com'
      );

      expect(url).toContain('user=user%2Btag%40example.com');
    });

    it('should use environment FRONTEND_URL when available', () => {
      process.env.FRONTEND_URL = 'https://custom-domain.com';

      const url = (service as any).generateUnsubscribeUrl('s1', 'u1');

      expect(url).toContain('https://custom-domain.com');

      delete process.env.FRONTEND_URL;
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
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
      };

      emailQueueService.sendNewsNotification!.mockRejectedValue(
        new Error('Email service down')
      );

      await expect((service as any).send(payload)).rejects.toThrow(
        'Email service down'
      );
    });

    it('should handle repository errors', async () => {
      const payload: NotificationPayload<NewsNotificationData> = {
        recipient: 'user@example.com',
        notificationType: NotificationType.NEWS_PUBLISHED,
        data: mockNewsData,
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

      await service.notifyNewsPublished(
        'user@example.com',
        'John Doe',
        mockNewsData
      );

      expect((service as any).validatePayload).toHaveBeenCalled();
      expect((service as any).createLog).toHaveBeenCalled();
      expect((service as any).send).toHaveBeenCalled();
    });

    it('should handle batch notification with mixed results', async () => {
      const followers = [
        { email: 'user1@example.com', name: 'User 1', userId: 'u1' },
        { email: 'user2@example.com', name: 'User 2', userId: 'u2' },
      ];

      jest
        .spyOn(service, 'notifyBatch')
        .mockResolvedValue([
          { success: true },
          { success: false, error: 'Email failed' },
        ]);

      const results = await service.notifyFollowers(followers, mockNewsData);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
