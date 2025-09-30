import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseAnalyticsRepository } from 'src/common/abstracts/analytics/base.analytics.repository';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from '../entities/analytics-event.entity';
import { DateRangeOptions } from 'src/common/interfaces/infrastructure/analytics.interface';
import {
  ProductMetrics,
  StoreMetrics,
  TopProductResult,
} from 'src/modules/analytics/types';
/**
 * AnalyticsEventRepository
 *
 * Enhanced repository for raw analytics events with improved query patterns,
 * better type safety, and reusable aggregation methods.
 */
@Injectable()
export class AnalyticsEventRepository extends BaseAnalyticsRepository<AnalyticsEvent> {
  private readonly eventTypeParams = {
    view: AnalyticsEventType.VIEW,
    purchase: AnalyticsEventType.PURCHASE,
    addToCart: AnalyticsEventType.ADD_TO_CART,
    checkout: AnalyticsEventType.CHECKOUT,
  };

  constructor(dataSource: DataSource) {
    super(AnalyticsEvent, dataSource.createEntityManager());
  }

  /**
   * Get aggregated metrics for a product within date range
   */
  async aggregateProductMetrics(
    productId: string,
    options: DateRangeOptions = {}
  ): Promise<ProductMetrics> {
    const qb = this.createQueryBuilder('e')
      .select([
        ...this.buildMetricSelections(['views', 'purchases', 'addToCarts']),
        ...this.buildValueSelections(['purchases']),
      ])
      .where('e.productId = :productId', { productId })
      .setParameters({
        views: this.eventTypeParams.view,
        purchases: this.eventTypeParams.purchase,
        addToCarts: this.eventTypeParams.addToCart,
      });

    this.applyDateRange(qb, options);

    const raw = await qb.getRawOne();
    const parsed = this.parseAggregationResult(raw);

    return {
      views: parsed.views || 0,
      purchases: parsed.purchases || 0,
      addToCarts: parsed.addToCarts || 0,
      revenue: parsed.purchases_value || 0,
    };
  }

  /**
   * Get aggregated metrics for a store within date range
   */
  async aggregateStoreMetrics(
    storeId: string,
    options: DateRangeOptions = {}
  ): Promise<StoreMetrics> {
    const qb = this.createQueryBuilder('e')
      .select([
        ...this.buildMetricSelections([
          'views',
          'purchases',
          'addToCarts',
          'checkouts',
        ]),
        ...this.buildValueSelections(['purchases']),
      ])
      .where('e.storeId = :storeId', { storeId })
      .setParameters({
        views: this.eventTypeParams.view,
        purchases: this.eventTypeParams.purchase,
        addToCarts: this.eventTypeParams.addToCart,
        checkouts: this.eventTypeParams.checkout,
      });

    this.applyDateRange(qb, options);

    const raw = await qb.getRawOne();
    const parsed = this.parseAggregationResult(raw);

    return {
      views: parsed.views || 0,
      purchases: parsed.purchases || 0,
      addToCarts: parsed.addToCarts || 0,
      checkouts: parsed.checkouts || 0,
      revenue: parsed.purchases_value || 0,
    };
  }

  /**
   * Get top products by conversion rate
   */
  async getTopProductsByConversion(
    storeId: string,
    options: DateRangeOptions & { limit?: number } = {}
  ): Promise<TopProductResult[]> {
    const { limit = 10, ...dateOptions } = options;

    const qb = this.createQueryBuilder('e')
      .select('e.productId', 'productId')
      .addSelect(
        'SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END)',
        'views'
      )
      .addSelect(
        'SUM(CASE WHEN e.eventType = :purchase THEN 1 ELSE 0 END)',
        'purchases'
      )
      .addSelect(
        'SUM(CASE WHEN e.eventType = :purchase THEN COALESCE(e.value,0) ELSE 0 END)',
        'revenue'
      )
      .where('e.storeId = :storeId', { storeId })
      .andWhere('e.productId IS NOT NULL')
      .setParameters({
        view: this.eventTypeParams.view,
        purchase: this.eventTypeParams.purchase,
      });

    this.applyDateRange(qb, dateOptions);

    const results = await qb
      .groupBy('e.productId')
      .having('SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END) > 0')
      .orderBy(
        `(SUM(CASE WHEN e.eventType = :purchase THEN 1 ELSE 0 END)::float / NULLIF(SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END),0)::float)`,
        'DESC'
      )
      .limit(limit)
      .getRawMany();

    return results.map((r: any) => {
      const views = Number(r.views || 0);
      const purchases = Number(r.purchases || 0);

      return {
        productId: r.productId,
        views,
        purchases,
        revenue: Number(r.revenue || 0),
        conversionRate: views > 0 ? purchases / views : 0,
      };
    });
  }

  /**
   * Get daily event counts for trending analysis
   */
  async getDailyEventCounts(
    filters: {
      storeId?: string;
      productId?: string;
      eventTypes?: AnalyticsEventType[];
    },
    options: DateRangeOptions = {}
  ): Promise<Array<{ date: string; eventType: string; count: number }>> {
    const qb = this.createQueryBuilder('e')
      .select([
        'DATE(e.createdAt) as date',
        'e.eventType as eventType',
        'COUNT(*) as count',
      ])
      .groupBy('DATE(e.createdAt), e.eventType')
      .orderBy('date', 'ASC')
      .addOrderBy('eventType', 'ASC');

    if (filters.storeId) {
      qb.andWhere('e.storeId = :storeId', { storeId: filters.storeId });
    }

    if (filters.productId) {
      qb.andWhere('e.productId = :productId', { productId: filters.productId });
    }

    if (filters.eventTypes?.length) {
      qb.andWhere('e.eventType IN (:...eventTypes)', {
        eventTypes: filters.eventTypes,
      });
    }

    this.applyDateRange(qb, options);

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      date: r.date,
      eventType: r.eventType,
      count: Number(r.count || 0),
    }));
  }

  /**
   * Efficient bulk insert for events
   */
  async bulkInsert(events: Partial<AnalyticsEvent>[]): Promise<void> {
    if (!events?.length) return;

    // Split into smaller batches to avoid database limits
    const batchSize = 1000;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      await this.manager
        .createQueryBuilder()
        .insert()
        .into(AnalyticsEvent)
        .values(batch)
        .orIgnore() // Handle potential duplicates gracefully
        .execute();
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use aggregateProductMetrics instead
   */
  async aggregateProductRange(productId: string, from?: string, to?: string) {
    return this.aggregateProductMetrics(productId, { from, to });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use aggregateStoreMetrics instead
   */
  async aggregateStoreRange(storeId: string, from?: string, to?: string) {
    return this.aggregateStoreMetrics(storeId, { from, to });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getTopProductsByConversion instead
   */
  async topProductsByConversion(
    storeId: string,
    from?: string,
    to?: string,
    limit = 10
  ) {
    return this.getTopProductsByConversion(storeId, { from, to, limit });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use bulkInsert instead
   */
  async insertMany(events: Partial<AnalyticsEvent>[]) {
    return this.bulkInsert(events);
  }
}
