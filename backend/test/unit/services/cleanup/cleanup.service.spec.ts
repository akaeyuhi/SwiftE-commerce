import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { AnalyticsEvent } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { Confirmation } from 'src/entities/user/authentication/confirmation.entity';
import { RefreshToken } from 'src/entities/user/authentication/refresh-token.entity';
import { InventoryNotificationLog } from 'src/entities/infrastructure/notifications/inventory-notification-log.entity';
import { NewsNotificationLog } from 'src/entities/infrastructure/notifications/news-notification-log.entity';
import { OrderNotificationLog } from 'src/entities/infrastructure/notifications/order-notification-log.entity';
import { CleanupSchedulerService } from 'src/modules/infrastructure/cleanup/cleanup.service';

describe('CleanupSchedulerService', () => {
  let service: CleanupSchedulerService;
  let schedulerRegistry: SchedulerRegistry;
  let configService: ConfigService;
  let cartRepo: Partial<Repository<ShoppingCart>>;
  let analyticsRepo: Partial<Repository<AnalyticsEvent>>;
  let confirmationRepo: Partial<Repository<Confirmation>>;
  let refreshTokenRepo: Partial<Repository<RefreshToken>>;
  let inventoryNotifRepo: Partial<Repository<InventoryNotificationLog>>;
  let newsNotifRepo: Partial<Repository<NewsNotificationLog>>;
  let orderNotifRepo: Partial<Repository<OrderNotificationLog>>;

  const mockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  });

  beforeEach(async () => {
    schedulerRegistry = {
      addCronJob: jest.fn(),
      getCronJob: jest.fn(),
      deleteCronJob: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue(true),
    } as any;

    cartRepo = {
      createQueryBuilder: jest.fn(),
    };

    analyticsRepo = {
      createQueryBuilder: jest.fn(),
      manager: {
        query: jest.fn(),
      } as any,
    };

    confirmationRepo = {
      createQueryBuilder: jest.fn(),
    };

    refreshTokenRepo = {
      createQueryBuilder: jest.fn(),
    };

    inventoryNotifRepo = {
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() } as any,
    };

    newsNotifRepo = {
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() } as any,
    };

    orderNotifRepo = {
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupSchedulerService,
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(ShoppingCart), useValue: cartRepo },
        {
          provide: getRepositoryToken(AnalyticsEvent),
          useValue: analyticsRepo,
        },
        {
          provide: getRepositoryToken(Confirmation),
          useValue: confirmationRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        {
          provide: getRepositoryToken(InventoryNotificationLog),
          useValue: inventoryNotifRepo,
        },
        {
          provide: getRepositoryToken(NewsNotificationLog),
          useValue: newsNotifRepo,
        },
        {
          provide: getRepositoryToken(OrderNotificationLog),
          useValue: orderNotifRepo,
        },
      ],
    }).compile();

    service = module.get<CleanupSchedulerService>(CleanupSchedulerService);

    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should register all cleanup tasks', () => {
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'cleanup-expired-carts' }),
        expect.any(Object)
      );
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'archive-old-analytics' }),
        expect.any(Object)
      );
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'cleanup-expired-confirmations' }),
        expect.any(Object)
      );
    });

    it('should respect config for comprehensive cleanup', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'ENABLE_COMPREHENSIVE_CLEANUP',
        true
      );
    });
  });

  describe('cleanupExpiredCarts', () => {
    it('should delete expired carts', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(5);
      qb.execute.mockResolvedValue({ affected: 5 });

      cartRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service['cleanupExpiredCarts'](false);

      expect(cartRepo.createQueryBuilder).toHaveBeenCalledWith('cart');
      expect(qb.where).toHaveBeenCalled();
      expect(qb.orWhere).toHaveBeenCalled();
      expect(qb.delete).toHaveBeenCalled();
      expect(qb.execute).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Deleted 5 expired shopping carts'
      );
    });

    it('should perform dry run without deleting', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(10);

      cartRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupExpiredCarts'](true);

      expect(result).toEqual({ deleted: 0, errors: 0 });
      expect(qb.delete).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DRY RUN]')
      );
    });

    it('should handle no expired carts', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 0 });

      cartRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupExpiredCarts'](false);

      expect(result.deleted).toBe(0);
    });
  });

  describe('archiveOldAnalytics', () => {
    it('should archive and delete old analytics events', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 100 });

      analyticsRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      analyticsRepo.manager!.query = jest.fn().mockResolvedValue(undefined);

      const result = await service['archiveOldAnalytics'](false);

      expect(result.deleted).toBe(100);
      expect(result.archived).toBe(100);
      expect(analyticsRepo.manager!.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_events_archive'),
        expect.any(Array)
      );
    });

    it('should perform dry run for analytics', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(50);

      analyticsRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['archiveOldAnalytics'](true);

      expect(result.deleted).toBe(0);
      expect(result.archived).toBe(0);
      expect(analyticsRepo.manager!.query).not.toHaveBeenCalled();
    });

    it('should handle archive errors', async () => {
      const qb = mockQueryBuilder();
      analyticsRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      analyticsRepo.manager!.query = jest
        .fn()
        .mockRejectedValue(new Error('Archive failed'));

      const result = await service['archiveOldAnalytics'](false);

      expect(result.errors).toBe(1);
      expect(result.deleted).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        'Error archiving analytics:',
        expect.any(Error)
      );
    });
  });

  describe('archiveOldNotifications', () => {
    it('should archive all notification types', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 10 });

      inventoryNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      newsNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      orderNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      inventoryNotifRepo.manager!.query = jest
        .fn()
        .mockResolvedValue(undefined);
      newsNotifRepo.manager!.query = jest.fn().mockResolvedValue(undefined);
      orderNotifRepo.manager!.query = jest.fn().mockResolvedValue(undefined);

      const result = await service['archiveOldNotifications'](false);

      expect(result.deleted).toBe(30); // 10 per type
      expect(inventoryNotifRepo.manager!.query).toHaveBeenCalled();
      expect(newsNotifRepo.manager!.query).toHaveBeenCalled();
      expect(orderNotifRepo.manager!.query).toHaveBeenCalled();
    });

    it('should perform dry run for notifications', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(5);

      inventoryNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      newsNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      orderNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['archiveOldNotifications'](true);

      expect(result.deleted).toBe(0);
    });

    it('should accumulate errors from multiple tables', async () => {
      const qb = mockQueryBuilder();
      inventoryNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      inventoryNotifRepo.manager!.query = jest
        .fn()
        .mockRejectedValue(new Error('Failed'));

      newsNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      newsNotifRepo.manager!.query = jest.fn().mockResolvedValue(undefined);
      qb.execute.mockResolvedValue({ affected: 5 });

      orderNotifRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
      orderNotifRepo.manager!.query = jest
        .fn()
        .mockRejectedValue(new Error('Failed'));

      const result = await service['archiveOldNotifications'](false);

      expect(result.errors).toBe(2);
      expect(result.deleted).toBe(5);
    });
  });

  describe('cleanupExpiredConfirmations', () => {
    it('should delete expired and used confirmations', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 15 });

      confirmationRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupExpiredConfirmations'](false);

      expect(result.deleted).toBe(15);
      expect(qb.where).toHaveBeenCalledWith(
        'conf.expiresAt < :now',
        expect.any(Object)
      );
      expect(qb.orWhere).toHaveBeenCalled();
    });

    it('should perform dry run', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(8);

      confirmationRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupExpiredConfirmations'](true);

      expect(result.deleted).toBe(0);
      expect(qb.delete).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldRefreshTokens', () => {
    it('should delete old refresh tokens', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 25 });

      refreshTokenRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupOldRefreshTokens'](false);

      expect(result.deleted).toBe(25);
      expect(qb.where).toHaveBeenCalledWith(
        'token.lastUsedAt < :expiryDate',
        expect.any(Object)
      );
    });

    it('should perform dry run', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(12);

      refreshTokenRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupOldRefreshTokens'](true);

      expect(result.deleted).toBe(0);
    });
  });

  describe('cleanupBannedTokens', () => {
    it('should delete banned tokens', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 5 });

      refreshTokenRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupBannedTokens'](false);

      expect(result.deleted).toBe(5);
      expect(qb.where).toHaveBeenCalledWith('token.isBanned = :isBanned', {
        isBanned: true,
      });
    });

    it('should perform dry run', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(3);

      refreshTokenRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service['cleanupBannedTokens'](true);

      expect(result.deleted).toBe(0);
    });
  });

  describe('comprehensiveCleanup', () => {
    beforeEach(() => {
      // Mock all cleanup methods
      service['cleanupExpiredCarts'] = jest
        .fn()
        .mockResolvedValue({ deleted: 5, errors: 0 });
      service['archiveOldAnalytics'] = jest
        .fn()
        .mockResolvedValue({ deleted: 100, archived: 100, errors: 0 });
      service['archiveOldNotifications'] = jest
        .fn()
        .mockResolvedValue({ deleted: 30, errors: 0 });
      service['cleanupExpiredConfirmations'] = jest
        .fn()
        .mockResolvedValue({ deleted: 15, errors: 0 });
      service['cleanupOldRefreshTokens'] = jest
        .fn()
        .mockResolvedValue({ deleted: 25, errors: 0 });
      service['cleanupBannedTokens'] = jest
        .fn()
        .mockResolvedValue({ deleted: 3, errors: 0 });
    });

    it('should run all cleanup tasks in sequence', async () => {
      await service['comprehensiveCleanup'](false);

      expect(service['cleanupExpiredCarts']).toHaveBeenCalledWith(false);
      expect(service['archiveOldAnalytics']).toHaveBeenCalledWith(false);
      expect(service['archiveOldNotifications']).toHaveBeenCalledWith(false);
      expect(service['cleanupExpiredConfirmations']).toHaveBeenCalledWith(
        false
      );
      expect(service['cleanupOldRefreshTokens']).toHaveBeenCalledWith(false);
      expect(service['cleanupBannedTokens']).toHaveBeenCalledWith(false);
    });

    it('should continue on individual task failures', async () => {
      service['cleanupExpiredCarts'] = jest
        .fn()
        .mockRejectedValue(new Error('Cart cleanup failed'));

      await service['comprehensiveCleanup'](false);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to run Expired Carts:',
        expect.any(Error)
      );
      expect(service['archiveOldAnalytics']).toHaveBeenCalled(); // Should continue
    });

    it('should log summary with totals', async () => {
      await service['comprehensiveCleanup'](false);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Comprehensive cleanup completed: 178 records processed'
        )
      );
    });

    it('should work in dry run mode', async () => {
      await service['comprehensiveCleanup'](true);

      expect(service['cleanupExpiredCarts']).toHaveBeenCalledWith(true);
      expect(service['archiveOldAnalytics']).toHaveBeenCalledWith(true);
    });
  });

  describe('executeTask', () => {
    it('should execute cleanup-expired-carts task', async () => {
      service['cleanupExpiredCarts'] = jest
        .fn()
        .mockResolvedValue({ deleted: 5, errors: 0 });

      await service['executeTask']('cleanup-expired-carts');

      expect(service['cleanupExpiredCarts']).toHaveBeenCalledWith(false);
    });

    it('should execute archive-old-analytics task', async () => {
      service['archiveOldAnalytics'] = jest
        .fn()
        .mockResolvedValue({ deleted: 100, errors: 0 });

      await service['executeTask']('archive-old-analytics');

      expect(service['archiveOldAnalytics']).toHaveBeenCalledWith(false);
    });

    it('should execute comprehensive-cleanup task', async () => {
      service['comprehensiveCleanup'] = jest.fn().mockResolvedValue(undefined);

      await service['executeTask']('comprehensive-cleanup');

      expect(service['comprehensiveCleanup']).toHaveBeenCalledWith(false);
    });

    it('should throw for unknown task', async () => {
      await expect(service['executeTask']('unknown-task')).rejects.toThrow(
        'Unknown cleanup task: unknown-task'
      );
    });

    it('should respect dry run context', async () => {
      service['cleanupExpiredCarts'] = jest
        .fn()
        .mockResolvedValue({ deleted: 0, errors: 0 });

      await service['executeTask']('cleanup-expired-carts', { dryRun: true });

      expect(service['cleanupExpiredCarts']).toHaveBeenCalledWith(true);
    });
  });

  describe('archiveNotificationTable', () => {
    it('should archive notification table', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 10 });

      const repo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        manager: { query: jest.fn().mockResolvedValue(undefined) },
      } as any;

      const result = await service['archiveNotificationTable'](
        repo,
        'test_table',
        new Date(),
        false
      );

      expect(result.deleted).toBe(10);
      expect(repo.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_table_archive'),
        expect.any(Array)
      );
    });

    it('should perform dry run', async () => {
      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(5);

      const repo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        manager: { query: jest.fn() },
      } as any;

      const result = await service['archiveNotificationTable'](
        repo,
        'test_table',
        new Date(),
        true
      );

      expect(result.deleted).toBe(0);
      expect(repo.manager.query).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const qb = mockQueryBuilder();
      const repo = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        manager: {
          query: jest.fn().mockRejectedValue(new Error('Archive failed')),
        },
      } as any;

      const result = await service['archiveNotificationTable'](
        repo,
        'test_table',
        new Date(),
        false
      );

      expect(result.errors).toBe(1);
      expect(result.deleted).toBe(0);
    });
  });

  describe('task lifecycle hooks', () => {
    it('should call onTaskSuccess', async () => {
      const onTaskSuccessSpy = jest.spyOn(service as any, 'onTaskSuccess');

      await service['onTaskSuccess']('test-task', 100);

      expect(onTaskSuccessSpy).toHaveBeenCalledWith('test-task', 100);
    });

    it('should call onTaskError', async () => {
      const onTaskErrorSpy = jest.spyOn(service as any, 'onTaskError');
      const error = new Error('Task failed');

      await service['onTaskError']('test-task', error, 100);

      expect(onTaskErrorSpy).toHaveBeenCalledWith('test-task', error, 100);
    });
  });

  describe('date calculations', () => {
    it('should calculate correct expiry dates', async () => {
      const qb = mockQueryBuilder();
      qb.execute.mockResolvedValue({ affected: 0 });

      cartRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service['cleanupExpiredCarts'](false);

      const whereCall = qb.where.mock.calls[0];
      const expiryDate = whereCall[1].expiryDate;

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      // Allow 1 second tolerance for test execution time
      expect(
        Math.abs(expiryDate.getTime() - expectedDate.getTime())
      ).toBeLessThan(1000);
    });
  });
});
