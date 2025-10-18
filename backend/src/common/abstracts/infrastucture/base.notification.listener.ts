import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DomainEvent,
  EventHandlerMetadata,
} from 'src/common/interfaces/infrastructure/event.interface';
import { BaseEventHandler } from 'src/common/abstracts/infrastucture/base.event.handler';

/**
 * BaseNotificationListener
 *
 * Abstract base class for notification listeners that handle domain events.
 * Extends BaseEventHandler to inherit retry logic, error handling, and metrics.
 *
 * Provides common notification functionality:
 * - Address formatting
 * - Date formatting
 * - Currency formatting
 * - URL generation utilities
 * - Logging with context
 *
 * Subclasses must implement:
 * - `handleEvent`: Process the specific event and send notifications
 * - `getEventTypes`: List of event types to listen for
 * - `getHandlerMetadata`: Handler configuration
 *
 * @template EventData - Type of event data payload
 * @template EventType - Union type of event type strings
 */
@Injectable()
export abstract class BaseNotificationListener<
  EventData = any,
  EventType extends string = string,
> extends BaseEventHandler<EventData, EventType> {
  protected abstract readonly logger: Logger;
  protected readonly baseUrl: string;

  // Retry configuration for notifications (less aggressive than critical events)
  protected readonly maxRetries: number = 3;
  protected readonly retryBackoff: 'fixed' | 'exponential' = 'exponential';
  protected readonly baseRetryDelay: number = 2000; // 2 seconds

  constructor(protected readonly eventEmitter: EventEmitter2) {
    super(eventEmitter);
    this.baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
  }

  /**
   * Validate notification-specific event requirements.
   *
   * Ensures event contains recipient information.
   */
  protected validateEvent(event: DomainEvent<EventData>): void {
    super.validateEvent(event);

    // Additional validation for notification events
    if (!event.data) {
      throw new Error('Event data is required for notifications');
    }
  }

  /**
   * Enhanced error handling with notification context.
   */
  protected async handleError(
    event: DomainEvent<EventData>,
    error: Error,
    attempt: number
  ): Promise<boolean> {
    this.logger.error(
      `Failed to send notification (attempt ${attempt}/${this.maxRetries})`,
      {
        eventType: event.type,
        aggregateId: event.aggregateId,
        attempt,
        error: error.message,
        stack: error.stack,
      }
    );

    // Retry for transient errors
    const transientErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Socket closed',
      'Connection lost',
    ];

    const isTransient = transientErrors.some((msg) =>
      error.message.includes(msg)
    );

    if (!isTransient) {
      this.logger.warn(
        `Non-transient error detected, skipping retries for event ${event.type}`
      );
      return false;
    }

    return attempt < this.maxRetries;
  }

  /**
   * Send failed notification to dead letter queue.
   *
   * Logs detailed information for manual intervention.
   */
  protected async sendToDeadLetter(
    event: DomainEvent<EventData>,
    lastError: Error
  ): Promise<void> {
    this.logger.error(
      `Notification failed after ${this.maxRetries} attempts - sending to dead letter queue`,
      {
        eventType: event.type,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        error: lastError.message,
        eventData: event.data,
      }
    );

    // TODO: Implement actual dead letter queue (e.g., Bull queue, SQS, etc.)
    // await this.deadLetterQueue.add(event);
  }

  /**
   * Record notification metrics.
   */
  protected recordMetrics(
    eventType: string,
    success: boolean,
    duration: number
  ): void {
    const status = success ? 'success' : 'failure';
    this.logger.debug(
      `Notification metrics: ${eventType} - ${status} (${duration}ms)`
    );

    // TODO: Integrate with metrics service (Prometheus, CloudWatch, etc.)
    // this.metricsService.recordNotification(eventType, success, duration);
  }

  /**
   * Get handler metadata with notification defaults.
   */
  protected getHandlerMetadata(): EventHandlerMetadata {
    return {
      eventType: this.getEventTypes().join('|'),
      priority: 2, // Lower priority than critical business logic
      async: true,
      description: `Notification handler for ${this.constructor.name}`,
    };
  }

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Format currency for display.
   *
   * @param amount - numeric amount
   * @param currency - currency code (default: USD)
   * @returns formatted currency string
   */
  protected formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format date for display.
   *
   * @param date - date to format
   * @param locale - locale code (default: en-US)
   * @returns formatted date string
   */
  protected formatDate(date: Date | string, locale: string = 'en-US'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format address object to multi-line string.
   *
   * @param address - address object
   * @returns formatted address string
   */
  protected formatAddress(address: {
    firstName?: string;
    lastName?: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
  }): string {
    const parts: string[] = [];

    // Full name
    const fullName = [address.firstName, address.lastName]
      .filter(Boolean)
      .join(' ');
    if (fullName) parts.push(fullName);

    // Company
    if (address.company) parts.push(address.company);

    // Address lines
    parts.push(address.addressLine1);
    if (address.addressLine2) parts.push(address.addressLine2);

    // City, State, Postal Code
    const cityLine = [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(', ');
    parts.push(cityLine);

    // Country
    parts.push(address.country);

    // Phone
    if (address.phone) parts.push(`Phone: ${address.phone}`);

    return parts.join('\n');
  }

  /**
   * Generate URL for entity.
   *
   * @param path - relative path
   * @returns full URL
   */
  protected generateUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  /**
   * Extract user display name with fallback.
   *
   * @param user - user object or name string
   * @returns display name
   */
  protected getUserDisplayName(user: any | string): string {
    if (typeof user === 'string') {
      return user;
    }

    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user?.firstName) {
      return user.firstName;
    }

    if (user?.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }

  /**
   * Generate excerpt from content.
   *
   * @param content - full content
   * @param maxLength - maximum length (default: 200)
   * @returns excerpt string
   */
  protected generateExcerpt(content: string, maxLength: number = 200): string {
    // Strip HTML tags
    const plainText = content.replace(/<[^>]*>/g, '');

    if (plainText.length <= maxLength) {
      return plainText;
    }

    return plainText.substring(0, maxLength).trim() + '...';
  }

  /**
   * Validate email format.
   *
   * @param email - email to validate
   * @returns true if valid
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Batch process notifications with delay.
   *
   * @param items - items to process
   * @param processor - async function to process each item
   * @param delayMs - delay between items (default: 100ms)
   */
  protected async batchProcess<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    delayMs: number = 100
  ): Promise<void> {
    for (const item of items) {
      try {
        await processor(item);
      } catch (error) {
        this.logger.error('Batch processing error', {
          item,
          error: error.message,
        });
      }

      if (delayMs > 0) {
        await this.sleep(delayMs);
      }
    }
  }
}
