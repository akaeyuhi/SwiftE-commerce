// src/modules/store/news/listeners/news-notifications.listener.ts

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsPublishedEvent } from 'src/common/events/news/news-published.event';
import { NewsNotificationData } from 'src/common/interfaces/notifications/news-notification.types';
import { StoreFollower } from 'src/entities/store/store-follower.entity';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { NewsNotificationService } from 'src/modules/infrastructure/notifications/news/news-notification.service';

/**
 * NewsNotificationsListener
 *
 * Event-driven notification orchestrator for news updates.
 * Listens to news publication events and sends notifications to:
 * 1. Store followers (users who opted in for news)
 * 2. Store admins and moderators
 *
 * Responsibilities:
 * - Fetch followers and store team members
 * - Transform events into notification payloads
 * - Batch send notifications via NewsNotificationService
 *
 * Decoupled architecture:
 * - NewsService emits events (doesn't know about notifications)
 * - This listener orchestrates notifications (doesn't know about email details)
 * - NewsNotificationService handles delivery (doesn't know about business logic)
 * - EmailQueueService manages async email delivery
 */
@Injectable()
export class NewsNotificationsListener {
  private readonly logger = new Logger(NewsNotificationsListener.name);

  constructor(
    @InjectRepository(StoreFollower)
    private readonly followerRepo: Repository<StoreFollower>,
    private readonly newsNotifications: NewsNotificationService,
    private readonly storeRoleService: StoreRoleService
  ) {}

  /**
   * Handle news published events.
   *
   * Sends notifications to all store followers and store team members.
   */
  @OnEvent('news.published', { async: true })
  async handleNewsPublished(event: NewsPublishedEvent): Promise<void> {
    try {
      this.logger.log(
        `Processing news publication notification: "${event.title}" for store ${event.storeName}`
      );

      // Get all recipients (followers + store team)
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
        unsubscribeUrl: '', // Will be set per-recipient in service
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
        `News notification "${event.title}": ${successCount} sent, ${failCount} failed ` +
          `to ${recipients.length} recipients`
      );
    } catch (error) {
      this.logger.error(
        `Error processing news.published event for "${event.title}"`,
        error.stack
      );
    }
  }

  /**
   * Get all notification recipients for a store.
   *
   * Includes:
   * - Store followers with email notifications enabled
   * - Store admins and moderators
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
        relations: ['user'],
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

      // 2. Get store team members (admins and moderators)
      const storeRoles = await this.storeRoleService.getStoreRoles(storeId);

      const teamMembers = storeRoles.filter(
        (role) =>
          role.isActive &&
          (role.roleName === StoreRoles.ADMIN ||
            role.roleName === StoreRoles.MODERATOR)
      );

      teamMembers.forEach((role) => {
        if (role.user?.email) {
          // Only add if not already in recipients (followers take precedence)
          if (!recipients.has(role.user.email)) {
            recipients.set(role.user.email, {
              email: role.user.email,
              name: this.getUserDisplayName(role.user),
              userId: role.user.id,
            });
          }
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
    return 'Reader';
  }

  /**
   * Format date for display.
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
