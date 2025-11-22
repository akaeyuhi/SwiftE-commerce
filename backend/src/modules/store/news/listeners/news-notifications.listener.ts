import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsPublishedEvent } from 'src/common/events/news/news-published.event';
import { NewsNotificationData } from 'src/common/interfaces/notifications/news-notification.types';
import { StoreFollower } from 'src/entities/store/store-follower.entity';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { DomainEvent } from 'src/common/interfaces/infrastructure/event.interface';
import { BaseNotificationListener } from 'src/common/abstracts/infrastucture/base.notification.listener';
import { NewsNotificationService } from 'src/modules/infrastructure/notifications/news/news-notification.service';
import { User } from 'src/entities/user/user.entity';

type NewsEventType = 'news.published';
type NewsEventData = NewsPublishedEvent;

/**
 * NewsNotificationsListener
 *
 * Listens to news domain events and sends notifications to followers.
 * Extends BaseNotificationListener for retry logic and error handling.
 *
 * Handles:
 * - news.published → Send notifications to store followers and team
 *
 * Features:
 * - Batch processing of multiple recipients
 * - Automatic retry with exponential backoff
 * - Recipient deduplication
 * - Error handling and logging
 */
@Injectable()
export class NewsNotificationsListener extends BaseNotificationListener<
  NewsEventData,
  NewsEventType
> {
  protected readonly logger = new Logger(NewsNotificationsListener.name);

  constructor(
    eventEmitter: EventEmitter2,
    @InjectRepository(StoreFollower)
    private readonly followerRepo: Repository<StoreFollower>,
    private readonly newsNotifications: NewsNotificationService,
    private readonly storeRoleService: StoreRoleService
  ) {
    super(eventEmitter);
  }

  /**
   * Process news events.
   */
  protected async handleEvent(
    event: DomainEvent<NewsEventData>
  ): Promise<void> {
    if (event.type === 'news.published') {
      await this.handleNewsPublished(event.data as NewsPublishedEvent);
    } else {
      this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Get event types this listener handles.
   */
  protected getEventTypes(): NewsEventType[] {
    return ['news.published'];
  }

  /**
   * Handle news published event.
   */
  private async handleNewsPublished(event: NewsPublishedEvent): Promise<void> {
    this.logger.log(
      `Processing news publication: "${event.title}" for store ${event.storeName}`
    );

    // Get all recipients
    const recipients = await this.getNotificationRecipients(event.storeId);

    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients found for news "${event.title}" in store ${event.storeName}`
      );
      return;
    }

    // Build notification data
    const notificationData: NewsNotificationData = {
      newsId: event.newsId,
      storeId: event.storeId,
      storeName: event.storeName,
      title: event.title,
      content: event.content,
      excerpt: event.excerpt,
      authorName: event.authorName,
      publishedAt: this.formatDate(event.publishedAt),
      newsUrl: event.newsUrl,
      coverImageUrl: event.coverImageUrl,
      category: event.category,
      unsubscribeUrl: '', // Will be set per-recipient
    };

    // Send notifications in batch
    const results = await this.newsNotifications.notifyFollowers(
      recipients,
      notificationData
    );

    // Log results
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    this.logger.log(
      `News notification "${event.title}": ${successCount} sent, ${failCount} failed to ${recipients.length} recipients`
    );
  }

  /**
   * Get all notification recipients for a store.
   */
  private async getNotificationRecipients(
    storeId: string
  ): Promise<Array<{ email: string; name: string; userId?: string }>> {
    const recipients = new Map<
      string,
      { email: string; name: string; userId?: string }
    >();

    try {
      // 1. Get store followers
      const followers = await this.followerRepo.find({
        where: {
          store: { id: storeId },
          emailNotifications: true,
        },
        relations: { user: true },
      });

      followers.forEach((follower) => {
        if (follower.user?.email) {
          recipients.set(follower.user.email, {
            email: follower.user.email,
            name: this.getUserDisplayName(follower.user),
            userId: follower.user.id,
          });
        }
      });

      this.logger.debug(
        `Found ${followers.length} followers for store ${storeId}`
      );

      // 2. Get store team members
      const storeRoles = await this.storeRoleService.getStoreRoles(storeId);
      const teamMembers = storeRoles.filter(
        (role) =>
          role.isActive &&
          (role.roleName === StoreRoles.ADMIN ||
            role.roleName === StoreRoles.MODERATOR)
      );

      teamMembers.forEach((role) => {
        if (role.user?.email && !recipients.has(role.user.email)) {
          recipients.set(role.user.email, {
            email: role.user.email,
            name: this.getUserDisplayName(role.user),
            userId: role.user.id,
          });
        }
      });

      this.logger.debug(
        `Found ${teamMembers.length} team members for store ${storeId}`
      );
    } catch (error) {
      this.logger.error(
        `Error fetching notification recipients for store ${storeId}`,
        error.stack
      );
    }

    return Array.from(recipients.values());
  }
  /**
   * Get user display name with fallback.
   */
  protected getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Reader';
  }

  /**
   * Format date for display.
   */
  protected formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
