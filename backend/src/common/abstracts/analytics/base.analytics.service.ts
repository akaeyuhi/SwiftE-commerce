import { Injectable } from '@nestjs/common';

/**
 * BaseAnalyticsService
 *
 * Abstract service for analytics event tracking and aggregation.
 * Provides common patterns for event collection, validation, batch processing,
 * and data aggregation across different analytics implementations.
 *
 * Subclasses must implement:
 * - `trackEvent`: Core event tracking logic
 * - `validateAggregator`: Validation for aggregation requests
 * - `runAggregation`: Execute specific aggregation logic
 *
 * Common functionality provided:
 * - `batchTrack`: Batch event processing with error handling
 * - `aggregate`: Aggregation with validation and error handling
 * - Event validation and sanitization helpers
 * - Rate limiting and throttling support
 *
 * Generics:
 * - `EventPayload` — Type of event data being tracked
 */
@Injectable()
export abstract class BaseAnalyticsService<EventPayload = any> {
  /**
   * Maximum batch size for bulk operations
   */
  protected readonly maxBatchSize: number = 1000;

  /**
   * Rate limiting: max events per second
   */
  protected readonly maxEventsPerSecond: number = 100;

  /**
   * Whether to validate events before processing
   */
  protected readonly validateEvents: boolean = true;

  /**
   * Track a single analytics event.
   *
   * Core method that must be implemented by subclasses.
   * Should handle the actual persistence/transmission of the event.
   *
   * @param event - event payload to track
   * @returns Promise resolving when event is tracked
   * @throws Error if tracking fails
   */
  abstract trackEvent(event: EventPayload): Promise<void>;

  /**
   * Validate aggregation request parameters.
   *
   * Should check if the aggregation name is supported and validate
   * any options/parameters required for the aggregation.
   *
   * @param aggregatorName - name of the aggregation to run
   * @param options - aggregation options and parameters
   * @throws Error if aggregation name or options are invalid
   */
  protected abstract validateAggregator(
    aggregatorName: string,
    options?: Record<string, any>
  ): void;

  /**
   * Execute aggregation logic.
   *
   * Contains the business logic for running specific aggregations.
   * Called after validation passes.
   *
   * @param aggregatorName - name of aggregation to run
   * @param options - aggregation options and parameters
   * @returns Promise resolving to aggregation results
   * @throws Error if aggregation fails
   */
  protected abstract runAggregation(
    aggregatorName: string,
    options?: Record<string, any>
  ): Promise<any>;

  /**
   * Track multiple events in batch.
   *
   * Processes events in batches with error handling and rate limiting.
   * Failed events are logged but don't stop processing of other events.
   *
   * @param events - array of events to track
   * @returns Promise resolving to batch processing results
   */
  async batchTrack(events: EventPayload[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ event: EventPayload; error: string }>;
  }> {
    if (!events || events.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    // Validate batch size
    if (events.length > this.maxBatchSize) {
      throw new Error(
        `Batch size ${events.length} exceeds maximum ${this.maxBatchSize}`
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ event: EventPayload; error: string }> = [];

    // Process events with rate limiting
    const batchSize = Math.min(this.maxEventsPerSecond, 50); // Process in smaller chunks

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async (event) => {
        try {
          // Validate event if validation is enabled
          if (this.validateEvents) {
            this.validateEvent(event);
          }

          await this.trackEvent(event);
          return { success: true, event };
        } catch (error) {
          return {
            success: false,
            event,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push({
              event: result.value.event,
              error: result.value.error ?? '',
            });
          }
        } else {
          failedCount++;
          // For rejected promises, we don't have the original event
          errors.push({
            event: null as any,
            error: result.reason?.message || 'Promise rejected',
          });
        }
      }

      // Rate limiting delay between batches
      if (i + batchSize < events.length) {
        await this.delay((1000 / this.maxEventsPerSecond) * batchSize);
      }
    }

    return { success: successCount, failed: failedCount, errors };
  }

  /**
   * Run aggregation with validation and error handling.
   *
   * Main entry point for running aggregations. Validates parameters,
   * executes aggregation logic, and handles errors.
   *
   * @param aggregatorName - name of aggregation to run
   * @param options - aggregation options and parameters
   * @returns Promise resolving to aggregation results
   * @throws Error if validation fails or aggregation errors
   */
  async aggregate(
    aggregatorName: string,
    options: Record<string, any> = {}
  ): Promise<any> {
    try {
      // Validate aggregation request
      this.validateAggregator(aggregatorName, options);

      // Execute aggregation
      const startTime = Date.now();
      const result = await this.runAggregation(aggregatorName, options);
      const duration = Date.now() - startTime;

      // Log aggregation metrics (override in subclass for custom logging)
      this.logAggregationMetrics(aggregatorName, duration, options);

      return result;
    } catch (error) {
      this.logAggregationError(aggregatorName, error, options);
      throw error;
    }
  }

  /**
   * Validate individual event payload.
   *
   * Override in subclasses for custom validation logic.
   * Default implementation performs basic structure validation.
   *
   * @param event - event to validate
   * @throws Error if event is invalid
   */
  protected validateEvent(event: EventPayload): void {
    if (!event) {
      throw new Error('Event cannot be null or undefined');
    }

    // Basic validation - override for more specific checks
    if (typeof event === 'object' && event !== null) {
      // Check for common required fields if they exist
      const eventObj = event as any;

      if (eventObj.type !== undefined && typeof eventObj.type !== 'string') {
        throw new Error('Event type must be a string');
      }

      if (
        eventObj.timestamp !== undefined &&
        !(eventObj.timestamp instanceof Date) &&
        typeof eventObj.timestamp !== 'string'
      ) {
        throw new Error('Event timestamp must be a Date object or ISO string');
      }
    }
  }

  /**
   * Sanitize event data.
   *
   * Override in subclasses to implement custom sanitization logic.
   * Default implementation removes sensitive fields and normalizes data.
   *
   * @param event - event to sanitize
   * @returns sanitized event
   */
  protected sanitizeEvent(event: EventPayload): EventPayload {
    if (!event || typeof event !== 'object') {
      return event;
    }

    const sanitized = { ...event } as any;

    // Remove common sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    // Normalize timestamp
    if (sanitized.timestamp && typeof sanitized.timestamp === 'string') {
      sanitized.timestamp = new Date(sanitized.timestamp);
    }

    return sanitized;
  }

  /**
   * Log aggregation metrics.
   *
   * Override in subclasses to integrate with monitoring systems.
   *
   * @param aggregatorName - name of aggregation
   * @param duration - execution time in milliseconds
   * @param options - aggregation options
   */
  protected logAggregationMetrics(
    aggregatorName: string,
    duration: number,
    options: Record<string, any>
  ): void {
    console.debug(`Aggregation ${aggregatorName} completed in ${duration}ms`, {
      options,
    });
  }

  /**
   * Log aggregation errors.
   *
   * Override in subclasses for custom error handling.
   *
   * @param aggregatorName - name of aggregation that failed
   * @param error - error that occurred
   * @param options - aggregation options
   */
  protected logAggregationError(
    aggregatorName: string,
    error: Error,
    options: Record<string, any>
  ): void {
    console.error(`Aggregation ${aggregatorName} failed:`, error.message, {
      options,
    });
  }

  /**
   * Get supported aggregator names.
   *
   * Override in subclasses to return list of supported aggregations.
   * Used for validation and documentation purposes.
   *
   * @returns Array of supported aggregator names
   */
  getSupportedAggregators(): string[] {
    return [];
  }

  /**
   * Get aggregation schema/documentation.
   *
   * Override in subclasses to provide documentation for aggregations.
   *
   * @param aggregatorName - name of aggregation
   * @returns Schema or documentation object
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAggregationSchema(aggregatorName: string): Record<string, any> | null {
    return null;
  }

  /**
   * Check if service is healthy and can process events.
   *
   * Override in subclasses to implement health checks.
   *
   * @returns Promise resolving to health status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
  }> {
    return { healthy: true };
  }

  /**
   * Get service statistics and metrics.
   *
   * Override in subclasses to provide service metrics.
   *
   * @returns Promise resolving to service stats
   */
  async getStats(): Promise<Record<string, any>> {
    return {};
  }

  /**
   * Delay execution for rate limiting.
   *
   * @param ms - milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Example usage:
 *
 * @Injectable()
 * export class CustomAnalyticsService extends BaseAnalyticsService<CustomEventType> {
 *
 *   async trackEvent(event: CustomEventType): Promise<void> {
 *     // Implement custom event tracking logic
 *     await this.eventQueue.add('track', event);
 *   }
 *
 *   protected validateAggregator(name: string, options?: any): void {
 *     const validAggregators = ['daily_stats', 'user_activity', 'conversion_funnel'];
 *     if (!validAggregators.includes(name)) {
 *       throw new Error(`Unknown aggregator: ${name}`);
 *     }
 *   }
 *
 *   protected async runAggregation(name: string, options: any = {}): Promise<any> {
 *     switch (name) {
 *       case 'daily_stats':
 *         return this.getDailyStats(options);
 *       case 'user_activity':
 *         return this.getUserActivity(options);
 *       default:
 *         throw new Error(`Aggregator ${name} not implemented`);
 *     }
 *   }
 * }
 */
