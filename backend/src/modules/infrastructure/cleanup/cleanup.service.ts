import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { Confirmation } from 'src/entities/user/authentication/confirmation.entity';
import { RefreshToken } from 'src/entities/user/authentication/refresh-token.entity';
import { BaseSchedulerService } from 'src/common/abstracts/infrastucture/base.scheduler.service';
import { AnalyticsEvent } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { InventoryNotificationLog } from 'src/entities/infrastructure/notifications/inventory-notification-log.entity';
import { NewsNotificationLog } from 'src/entities/infrastructure/notifications/news-notification-log.entity';
import { OrderNotificationLog } from 'src/entities/infrastructure/notifications/order-notification-log.entity';

interface CleanupContext {
  dryRun?: boolean;
  force?: boolean;
  specificTask?: string;
}

interface CleanupResult {
  deleted: number;
  archived?: number;
  errors: number;
}

@Injectable()
export class CleanupSchedulerService extends BaseSchedulerService<CleanupContext> {
  private readonly CART_EXPIRY_DAYS = 30;
  private readonly ANALYTICS_ARCHIVE_DAYS = 90;
  private readonly NOTIFICATION_ARCHIVE_DAYS = 180;
  private readonly CONFIRMATION_EXPIRY_DAYS = 7;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 90;

  constructor(
    schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService,
    @InjectRepository(ShoppingCart)
    private cartRepo: Repository<ShoppingCart>,
    @InjectRepository(AnalyticsEvent)
    private analyticsRepo: Repository<AnalyticsEvent>,
    @InjectRepository(Confirmation)
    private confirmationRepo: Repository<Confirmation>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(InventoryNotificationLog)
    private inventoryNotifRepo: Repository<InventoryNotificationLog>,
    @InjectRepository(NewsNotificationLog)
    private newsNotifRepo: Repository<NewsNotificationLog>,
    @InjectRepository(OrderNotificationLog)
    private orderNotifRepo: Repository<OrderNotificationLog>
  ) {
    super(schedulerRegistry);
  }

  protected registerTasks(): void {
    // Run every day at 2 AM UTC
    this.addTask('cleanup-expired-carts', '0 2 * * *', {
      enabled: true,
      timezone: 'UTC',
    });

    // Archive old analytics events weekly on Sunday at 3 AM
    this.addTask('archive-old-analytics', '0 3 * * 0', {
      enabled: true,
      timezone: 'UTC',
    });

    // Archive old notification logs weekly on Sunday at 4 AM
    this.addTask('archive-old-notifications', '0 4 * * 0', {
      enabled: true,
      timezone: 'UTC',
    });

    // Clean up expired confirmations daily at 1 AM
    this.addTask('cleanup-expired-confirmations', '0 1 * * *', {
      enabled: true,
      timezone: 'UTC',
    });

    // Clean up old refresh tokens daily at 1:30 AM
    this.addTask('cleanup-old-refresh-tokens', '30 1 * * *', {
      enabled: true,
      timezone: 'UTC',
    });

    // Clean up banned/invalid tokens every 6 hours
    this.addTask('cleanup-banned-tokens', '0 */6 * * *', {
      enabled: true,
      timezone: 'UTC',
    });

    // Comprehensive cleanup weekly on Sunday at 5 AM
    this.addTask('comprehensive-cleanup', '0 5 * * 0', {
      enabled: this.configService.get('ENABLE_COMPREHENSIVE_CLEANUP', true),
      timezone: 'UTC',
    });
  }

  protected async executeTask(
    taskName: string,
    context?: CleanupContext
  ): Promise<void> {
    const dryRun = context?.dryRun ?? false;

    switch (taskName) {
      case 'cleanup-expired-carts':
        await this.cleanupExpiredCarts(dryRun);
        break;

      case 'archive-old-analytics':
        await this.archiveOldAnalytics(dryRun);
        break;

      case 'archive-old-notifications':
        await this.archiveOldNotifications(dryRun);
        break;

      case 'cleanup-expired-confirmations':
        await this.cleanupExpiredConfirmations(dryRun);
        break;

      case 'cleanup-old-refresh-tokens':
        await this.cleanupOldRefreshTokens(dryRun);
        break;

      case 'cleanup-banned-tokens':
        await this.cleanupBannedTokens(dryRun);
        break;

      case 'comprehensive-cleanup':
        await this.comprehensiveCleanup(dryRun);
        break;

      default:
        throw new Error(`Unknown cleanup task: ${taskName}`);
    }
  }

  /**
   * Clean up expired shopping carts
   */
  private async cleanupExpiredCarts(dryRun: boolean): Promise<CleanupResult> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.CART_EXPIRY_DAYS);

    const query = this.cartRepo
      .createQueryBuilder('cart')
      .where('cart.expiresAt < :expiryDate', { expiryDate })
      .orWhere('cart.updatedAt < :expiryDate AND cart.expiresAt IS NULL', {
        expiryDate,
      });

    if (dryRun) {
      const count = await query.getCount();
      console.log(
        `[DRY RUN] Would delete ${count} expired carts older than ${this.CART_EXPIRY_DAYS} days`
      );
      return { deleted: 0, errors: 0 };
    }

    const result = await query.delete().execute();
    console.log(`Deleted ${result.affected} expired shopping carts`);

    return { deleted: result.affected || 0, errors: 0 };
  }

  /**
   * Archive old analytics events to separate table
   */
  private async archiveOldAnalytics(dryRun: boolean): Promise<CleanupResult> {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - this.ANALYTICS_ARCHIVE_DAYS);

    const query = this.analyticsRepo
      .createQueryBuilder('event')
      .where('event.createdAt < :archiveDate', { archiveDate });

    if (dryRun) {
      const count = await query.getCount();
      console.log(
        `[DRY RUN] Would archive ${count} analytics events older than ${this.ANALYTICS_ARCHIVE_DAYS} days`
      );
      return { deleted: 0, archived: 0, errors: 0 };
    }

    try {
      // Archive to separate table (assumes you have analytics_events_archive table)
      await this.analyticsRepo.manager.query(
        `
        INSERT INTO analytics_events_archive 
        SELECT * FROM analytics_events 
        WHERE created_at < $1
      `,
        [archiveDate]
      );

      // Delete archived records
      const result = await query.delete().execute();
      console.log(
        `Archived and deleted ${result.affected} old analytics events`
      );

      return {
        deleted: result.affected || 0,
        archived: result.affected || 0,
        errors: 0,
      };
    } catch (error) {
      console.error('Error archiving analytics:', error);
      return { deleted: 0, archived: 0, errors: 1 };
    }
  }

  /**
   * Archive old notification logs
   */
  private async archiveOldNotifications(
    dryRun: boolean
  ): Promise<CleanupResult> {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - this.NOTIFICATION_ARCHIVE_DAYS);

    let totalDeleted = 0;
    let totalErrors = 0;

    // Archive inventory notifications
    const inventoryResult = await this.archiveNotificationTable(
      this.inventoryNotifRepo,
      'inventory_notification_logs',
      archiveDate,
      dryRun
    );
    totalDeleted += inventoryResult.deleted;
    totalErrors += inventoryResult.errors;

    // Archive news notifications
    const newsResult = await this.archiveNotificationTable(
      this.newsNotifRepo,
      'news_notification_logs',
      archiveDate,
      dryRun
    );
    totalDeleted += newsResult.deleted;
    totalErrors += newsResult.errors;

    // Archive order notifications
    const orderResult = await this.archiveNotificationTable(
      this.orderNotifRepo,
      'order_notification_logs',
      archiveDate,
      dryRun
    );
    totalDeleted += orderResult.deleted;
    totalErrors += orderResult.errors;

    console.log(
      `Archived ${totalDeleted} notification logs (${totalErrors} errors)`
    );

    return { deleted: totalDeleted, errors: totalErrors };
  }

  /**
   * Helper to archive a notification log table
   */
  private async archiveNotificationTable(
    repo: Repository<any>,
    tableName: string,
    archiveDate: Date,
    dryRun: boolean
  ): Promise<CleanupResult> {
    const query = repo
      .createQueryBuilder('log')
      .where('log.createdAt < :archiveDate', { archiveDate })
      .andWhere(`log.status = 'DELIVERED'`);

    if (dryRun) {
      const count = await query.getCount();
      console.log(`[DRY RUN] Would archive ${count} records from ${tableName}`);
      return { deleted: 0, errors: 0 };
    }

    try {
      // Archive to separate table
      await repo.manager.query(
        `
        INSERT INTO ${tableName}_archive 
        SELECT * FROM ${tableName} 
        WHERE created_at < $1 AND status = 'DELIVERED'
      `,
        [archiveDate]
      );

      // Delete archived records
      const result = await query.delete().execute();
      return { deleted: result.affected || 0, errors: 0 };
    } catch (error) {
      console.error(`Error archiving ${tableName}:`, error);
      return { deleted: 0, errors: 1 };
    }
  }

  /**
   * Clean up expired or used confirmations
   */
  private async cleanupExpiredConfirmations(
    dryRun: boolean
  ): Promise<CleanupResult> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.CONFIRMATION_EXPIRY_DAYS);

    if (dryRun) {
      // For dry run, use SELECT query with alias
      const count = await this.confirmationRepo
        .createQueryBuilder('conf')
        .where('conf.expiresAt < :now', { now: new Date() })
        .orWhere('conf.isUsed = :isUsed AND conf.usedAt < :expiryDate', {
          isUsed: true,
          expiryDate,
        })
        .getCount();

      console.log(`[DRY RUN] Would delete ${count} expired confirmations`);
      return { deleted: 0, errors: 0 };
    }

    const result = await this.confirmationRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .orWhere('isUsed = :isUsed AND usedAt < :expiryDate', {
        isUsed: true,
        expiryDate,
      })
      .execute();

    console.log(`Deleted ${result.affected} expired confirmations`);
    return { deleted: result.affected || 0, errors: 0 };
  }

  /**
   * Clean up old refresh tokens
   */
  private async cleanupOldRefreshTokens(
    dryRun: boolean
  ): Promise<CleanupResult> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.REFRESH_TOKEN_EXPIRY_DAYS);

    const query = this.refreshTokenRepo
      .createQueryBuilder('token')
      .where('token.lastUsedAt < :expiryDate', { expiryDate })
      .orWhere('token.createdAt < :expiryDate AND token.lastUsedAt IS NULL', {
        expiryDate,
      });

    if (dryRun) {
      const count = await query.getCount();
      console.log(`[DRY RUN] Would delete ${count} old refresh tokens`);
      return { deleted: 0, errors: 0 };
    }

    const result = await query.delete().execute();
    console.log(`Deleted ${result.affected} old refresh tokens`);

    return { deleted: result.affected || 0, errors: 0 };
  }

  /**
   * Clean up banned or invalid tokens immediately
   */
  private async cleanupBannedTokens(dryRun: boolean): Promise<CleanupResult> {
    const query = this.refreshTokenRepo
      .createQueryBuilder('token')
      .where('token.isBanned = :isBanned', { isBanned: true });

    if (dryRun) {
      const count = await query.getCount();
      console.log(`[DRY RUN] Would delete ${count} banned tokens`);
      return { deleted: 0, errors: 0 };
    }

    const result = await query.delete().execute();
    console.log(`Deleted ${result.affected} banned refresh tokens`);

    return { deleted: result.affected || 0, errors: 0 };
  }

  /**
   * Run all cleanup tasks in sequence
   */
  private async comprehensiveCleanup(dryRun: boolean): Promise<void> {
    console.log('Starting comprehensive cleanup...');

    const tasks = [
      { name: 'Expired Carts', fn: () => this.cleanupExpiredCarts(dryRun) },
      {
        name: 'Old Analytics',
        fn: () => this.archiveOldAnalytics(dryRun),
      },
      {
        name: 'Old Notifications',
        fn: () => this.archiveOldNotifications(dryRun),
      },
      {
        name: 'Expired Confirmations',
        fn: () => this.cleanupExpiredConfirmations(dryRun),
      },
      {
        name: 'Old Refresh Tokens',
        fn: () => this.cleanupOldRefreshTokens(dryRun),
      },
      {
        name: 'Banned Tokens',
        fn: () => this.cleanupBannedTokens(dryRun),
      },
    ];

    const results: Record<string, CleanupResult> = {};

    for (const task of tasks) {
      try {
        console.log(`Running cleanup: ${task.name}`);
        results[task.name] = await task.fn();
      } catch (error) {
        console.error(`Failed to run ${task.name}:`, error);
        results[task.name] = { deleted: 0, errors: 1 };
      }
    }

    // Log summary
    const totalDeleted = Object.values(results).reduce(
      (sum, r) => sum + r.deleted,
      0
    );
    const totalErrors = Object.values(results).reduce(
      (sum, r) => sum + r.errors,
      0
    );

    console.log(
      `Comprehensive cleanup completed: ${totalDeleted} records processed, ${totalErrors} errors`
    );
  }

  /**
   * Override to add custom success metrics
   */
  protected async onTaskSuccess(
    taskName: string,
    duration: number
  ): Promise<void> {
    await super.onTaskSuccess(taskName, duration);

    // Could send to monitoring service
    // await this.metricsService.recordTaskSuccess(taskName, duration);
  }

  /**
   * Override to add custom error alerting
   */
  protected async onTaskError(
    taskName: string,
    error: Error,
    duration: number
  ): Promise<void> {
    await super.onTaskError(taskName, error, duration);

    // Send alert for critical failures
    if (taskName === 'comprehensive-cleanup') {
      // await this.alertService.sendCleanupFailureAlert(taskName, error);
    }
  }
}
