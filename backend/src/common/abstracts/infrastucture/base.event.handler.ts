/* eslint-disable brace-style */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DomainEvent,
  EventHandlerMetadata,
} from 'src/common/interfaces/infrastructure/event.interface';

/**
 * BaseEventHandler
 *
 * Abstract handler for domain events with patterns for subscription management,
 * error handling, retry logic, and event versioning.
 *
 * Subclasses must implement:
 * - `handleEvent`: Core event processing logic
 * - `getEventTypes`: List of event types this handler processes
 * - `getHandlerMetadata`: Handler configuration and options
 *
 * Common functionality provided:
 * - Automatic event subscription/unsubscription
 * - Error handling and retry logic
 * - Event filtering and validation
 * - Metrics and monitoring hooks
 * - Dead letter queue support
 *
 * Generics:
 * - `EventData` — Type of event data payload
 * - `EventType` — Union type of event type strings this handler processes
 */
@Injectable()
export abstract class BaseEventHandler<
    EventData = any,
    EventType extends string = string,
  >
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Maximum retry attempts for failed event processing
   */
  protected readonly maxRetries: number = 3;

  /**
   * Backoff strategy for retries
   */
  protected readonly retryBackoff: 'fixed' | 'exponential' = 'exponential';

  /**
   * Base delay for retries (ms)
   */
  protected readonly baseRetryDelay: number = 1000;

  constructor(protected readonly eventEmitter: EventEmitter2) {}

  /**
   * Process an event.
   *
   * Core business logic for handling the event. Must be implemented by subclasses.
   * Should be idempotent when possible to handle duplicate events gracefully.
   *
   * @param event - domain event to process
   * @returns Promise resolving when event is processed
   * @throws Error if processing fails
   */
  protected abstract handleEvent(event: DomainEvent<EventData>): Promise<void>;

  /**
   * Get list of event types this handler processes.
   *
   * @returns Array of event type strings
   */
  protected abstract getEventTypes(): EventType[];

  /**
   * Get handler metadata and configuration.
   *
   * @returns Handler metadata object
   */
  protected abstract getHandlerMetadata(): EventHandlerMetadata;

  /**
   * Validate event before processing.
   *
   * Override to implement custom validation logic.
   * Default implementation checks basic event structure.
   *
   * @param event - event to validate
   * @throws Error if event is invalid
   */
  protected validateEvent(event: DomainEvent<EventData>): void {
    if (!event.type || !event.aggregateId || !event.occurredAt) {
      throw new Error('Invalid event: missing required fields');
    }
  }

  /**
   * Filter events before processing.
   *
   * Override to implement custom filtering logic (e.g., by tenant, user, etc.)
   * Default implementation always returns true.
   *
   * @param event - event to filter
   * @returns true if event should be processed
   */
  protected shouldProcessEvent(event: DomainEvent<EventData>): boolean {
    return !!event;
  }

  /**
   * Handle event processing errors.
   *
   * Override to customize error handling (logging, metrics, etc.)
   *
   * @param event - event that failed processing
   * @param error - error that occurred
   * @param attempt - current attempt number (1-based)
   * @returns true to retry, false to give up
   */
  protected async handleError(
    event: DomainEvent<EventData>,
    error: Error,
    attempt: number
  ): Promise<boolean> {
    console.error(
      `Event handler error [${this.constructor.name}] attempt ${attempt}:`,
      error,
      { event }
    );

    return attempt < this.maxRetries;
  }

  /**
   * Send event to dead letter queue.
   *
   * Override to implement dead letter handling.
   * Default implementation logs the failed event.
   *
   * @param event - event that exhausted retries
   * @param lastError - final error
   */
  protected async sendToDeadLetter(
    event: DomainEvent<EventData>,
    lastError: Error
  ): Promise<void> {
    console.error(
      `Event sent to dead letter queue [${this.constructor.name}]:`,
      lastError,
      { event }
    );
  }

  /**
   * Record metrics for event processing.
   *
   * Override to integrate with monitoring systems.
   *
   * @param eventType - type of event processed
   * @param success - whether processing succeeded
   * @param duration - processing time in ms
   */
  protected recordMetrics(
    eventType: string,
    success: boolean,
    duration: number
  ): void {
    // Default implementation - override for actual metrics
    console.debug(
      `Event metrics: ${eventType} ${success ? 'success' : 'failure'} ${duration}ms`
    );
  }

  /**
   * Main event handler wrapper with error handling and retries.
   *
   * This is the method bound to event listeners. It wraps handleEvent()
   * with validation, filtering, error handling, and retry logic.
   *
   * @param event - event received from event emitter
   */
  private async processEvent(event: DomainEvent<EventData>): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    try {
      // Validate event
      this.validateEvent(event);

      // Filter event
      if (!this.shouldProcessEvent(event)) {
        return;
      }

      // Process with retries
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          await this.handleEvent(event);

          // Record success metrics
          this.recordMetrics(event.type, true, Date.now() - startTime);
          return;
        } catch (error) {
          lastError = error;

          const shouldRetry = await this.handleError(event, error, attempt);

          if (!shouldRetry || attempt === this.maxRetries) {
            break;
          }

          // Calculate retry delay
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }

      // If we reach here, all retries failed
      await this.sendToDeadLetter(event, lastError!);
      this.recordMetrics(event.type, false, Date.now() - startTime);
    } catch (error) {
      // Handle validation or other pre-processing errors
      console.error(
        `Event handler fatal error [${this.constructor.name}]:`,
        error,
        { event }
      );
      this.recordMetrics(event.type, false, Date.now() - startTime);
    }
  }

  /**
   * Calculate retry delay based on attempt number.
   *
   * @param attempt - current attempt number (1-based)
   * @returns delay in milliseconds
   */
  private calculateRetryDelay(attempt: number): number {
    if (this.retryBackoff === 'exponential') {
      return this.baseRetryDelay * Math.pow(2, attempt - 1);
    }
    return this.baseRetryDelay;
  }

  /**
   * Sleep for specified duration.
   *
   * @param ms - milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Subscribe to events when module initializes.
   */
  async onModuleInit(): Promise<void> {
    const eventTypes = this.getEventTypes();

    for (const eventType of eventTypes) {
      this.eventEmitter.on(eventType, (event) => this.processEvent(event));
    }

    console.log(
      `Event handler [${this.constructor.name}] subscribed to:`,
      eventTypes
    );
  }

  /**
   * Unsubscribe from events when module destroys.
   */
  async onModuleDestroy(): Promise<void> {
    const eventTypes = this.getEventTypes();

    for (const eventType of eventTypes) {
      this.eventEmitter.removeAllListeners(eventType);
    }

    console.log(
      `Event handler [${this.constructor.name}] unsubscribed from:`,
      eventTypes
    );
  }
}

/**
 * Example usage:
 *
 * type OrderEventType = 'order.created' | 'order.cancelled' | 'order.shipped';
 *
 * interface OrderEventData {
 *   orderId: string;
 *   customerId: string;
 *   amount: number;
 *   status: string;
 * }
 *
 * @Injectable()
 * export class OrderNotificationHandler extends BaseEventHandler<OrderEventData, OrderEventType> {
 *   constructor(
 *     eventEmitter: EventEmitter2,
 *     private emailService: EmailService
 *   ) {
 *     super(eventEmitter);
 *   }
 *
 *   protected async handleEvent(event: DomainEvent<OrderEventData>): Promise<void> {
 *     switch (event.type) {
 *       case 'order.created':
 *         await this.sendOrderConfirmation(event.data);
 *         break;
 *       case 'order.shipped':
 *         await this.sendShippingNotification(event.data);
 *         break;
 *       // ... other cases
 *     }
 *   }
 *
 *   protected getEventTypes(): OrderEventType[] {
 *     return ['order.created', 'order.cancelled', 'order.shipped'];
 *   }
 *
 *   protected getHandlerMetadata(): EventHandlerMetadata {
 *     return {
 *       eventType: 'order.*',
 *       priority: 1,
 *       async: true
 *     };
 *   }
 * }
 */
