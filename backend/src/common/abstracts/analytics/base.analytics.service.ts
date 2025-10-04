import { Injectable } from '@nestjs/common';

/**
 * BaseAnalyticsService
 *
 * Abstract service for analytics event tracking and aggregation.
 * Provides common patterns for event collection, validation, batch processing,
 * and data aggregation across different analytics implementations.
 *
 * All property names and methods follow camelCase conventions.
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
   * Track a single analytics event
   */
  abstract trackEvent(event: EventPayload): Promise<void>;

  /**
   * Validate aggregation request parameters
   */
  protected abstract validateAggregator(
    aggregatorName: string,
    options?: Record<string, any>
  ): void;

  /**
   * Execute aggregation logic
   */
  protected abstract runAggregation(
    aggregatorName: string,
    options?: Record<string, any>
  ): Promise<any>;

  /**
   * Track multiple events in batch
   */
  async batchTrack(events: EventPayload[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ event: EventPayload; error: string }>;
  }> {
    if (!events || events.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    if (events.length > this.maxBatchSize) {
      throw new Error(
        `Batch size ${events.length} exceeds maximum ${this.maxBatchSize}`
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ event: EventPayload; error: string }> = [];

    const batchSize = Math.min(this.maxEventsPerSecond, 50);

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      const batchPromises = batch.map(async (event) => {
        try {
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
          errors.push({
            event: null as any,
            error: result.reason?.message || 'Promise rejected',
          });
        }
      }

      if (i + batchSize < events.length) {
        await this.delay((1000 / this.maxEventsPerSecond) * batchSize);
      }
    }

    return { success: successCount, failed: failedCount, errors };
  }

  /**
   * Run aggregation with validation and error handling
   */
  async aggregate(
    aggregatorName: string,
    options: Record<string, any> = {}
  ): Promise<any> {
    try {
      this.validateAggregator(aggregatorName, options);

      const startTime = Date.now();
      const result = await this.runAggregation(aggregatorName, options);
      const duration = Date.now() - startTime;

      this.logAggregationMetrics(aggregatorName, duration, options);

      return result;
    } catch (error) {
      this.logAggregationError(aggregatorName, error, options);
      throw error;
    }
  }

  /**
   * Validate individual event payload
   */
  protected validateEvent(event: EventPayload): void {
    if (!event) {
      throw new Error('Event cannot be null or undefined');
    }

    if (typeof event === 'object') {
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
   * Sanitize event data
   */
  protected sanitizeEvent(event: EventPayload): EventPayload {
    if (!event || typeof event !== 'object') {
      return event;
    }

    const sanitized = { ...event } as any;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    if (sanitized.timestamp && typeof sanitized.timestamp === 'string') {
      sanitized.timestamp = new Date(sanitized.timestamp);
    }

    return sanitized;
  }

  /**
   * Log aggregation metrics
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
   * Log aggregation errors
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
   * Get supported aggregator names
   */
  getSupportedAggregators(): string[] {
    return [
      'productConversion',
      'storeConversion',
      'topProductsByConversion',
      'storeStats',
      'productStats',
      'productRating',
      'storeRatingsSummary',
      'funnelAnalysis',
      'userJourney',
      'cohortAnalysis',
      'revenueTrends',
      'storeComparison',
      'productComparison',
      'periodComparison',
      'topPerformingStores',
      'topPerformingProducts',
      'underperformingAnalysis',
    ];
  }

  /**
   * Get aggregation schema/documentation
   */
  getAggregationSchema(aggregatorName: string): any {
    const schemas: Record<string, any> = {
      productConversion: {
        name: 'productConversion',
        description: 'Compute product conversion metrics',
        requiredParams: ['productId'],
        optionalParams: ['from', 'to'],
      },
      storeConversion: {
        name: 'storeConversion',
        description: 'Compute store conversion metrics',
        requiredParams: ['storeId'],
        optionalParams: ['from', 'to'],
      },
      topProductsByConversion: {
        name: 'topProductsByConversion',
        description: 'Get top products by conversion rate',
        requiredParams: ['storeId'],
        optionalParams: ['from', 'to', 'limit'],
      },
    };

    return schemas[aggregatorName] || null;
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, any>;
  }> {
    return { healthy: true };
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<Record<string, any>> {
    return {};
  }

  /**
   * Delay execution for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
