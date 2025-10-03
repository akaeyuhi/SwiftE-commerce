import { BaseRepository } from 'src/common/abstracts/base.repository';
import { ObjectLiteral } from 'typeorm';
import {
  AggregationResult,
  DateRangeOptions,
} from 'src/common/interfaces/infrastructure/analytics.interface';

/**
 * BaseAnalyticsRepository
 *
 * Abstract repository for analytics data with common aggregation patterns.
 * Provides reusable methods for date range filtering and metric aggregation.
 */
export abstract class BaseAnalyticsRepository<
  Entity extends ObjectLiteral,
> extends BaseRepository<Entity> {
  /**
   * Build date range conditions for query builder
   */
  protected applyDateRange(
    qb: any,
    options: DateRangeOptions,
    dateField: string = 'createdAt'
  ) {
    if (options.from) {
      qb.andWhere(`${dateField} >= :from`, {
        from: `${options.from}T00:00:00Z`,
      });
    }
    if (options.to) {
      qb.andWhere(`${dateField} <= :to`, {
        to: `${options.to}T23:59:59Z`,
      });
    }
    return qb;
  }

  /**
   * Parse raw aggregation results with proper type conversion
   */
  protected parseAggregationResult(raw: any): AggregationResult {
    const result: AggregationResult = {};

    for (const [key, value] of Object.entries(raw || {})) {
      result[key] = Number(value || 0) ?? value;
    }

    return result;
  }

  /**
   * Parse aggregation result with safe handling of ID fields
   */
  protected parseMetricsWithId(raw: any): {
    productId: string;
    views: number;
    purchases: number;
    addToCarts: number;
    revenue: number;
  } {
    return {
      productId: raw.p_productId || raw.productId, // Keep as string
      views: Number(raw.views || 0),
      purchases: Number(raw.purchases || 0),
      addToCarts: Number(raw.addToCarts || 0),
      revenue: Number(raw.revenue || 0),
    };
  }

  /**
   * Build standard metric selections for analytics queries
   */
  protected buildMetricSelections(
    metrics: string[],
    eventTypeMapping?: Record<string, string>
  ) {
    return metrics.map((metric) => {
      const eventType = eventTypeMapping?.[metric] || metric.toUpperCase();
      return `SUM(CASE WHEN eventType = :${eventType} THEN 1 ELSE 0 END) as ${metric}`;
    });
  }

  /**
   * Build revenue/value selections
   */
  protected buildValueSelections(valueMetrics: string[]) {
    return valueMetrics.map(
      (metric) =>
        `SUM(CASE WHEN eventType = :${metric} THEN COALESCE(value, 0) ELSE 0 END) as ${metric}_value`
    );
  }
}
