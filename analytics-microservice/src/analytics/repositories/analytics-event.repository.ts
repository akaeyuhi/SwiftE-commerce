import { Injectable } from '@nestjs/common';
import { DateRangeOptions } from 'common/interfaces/analytics.interface';
import { DataSource } from 'typeorm';
import {
  EventUserJourney,
  ProductMetrics,
  StoreMetrics,
  TopProductResult,
} from 'src/analytics/types';
import { BaseAnalyticsRepository } from 'common/abstracts/analytics/base.analytics.repository';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from 'entities/analytics-event.entity';

/**
 * AnalyticsEventRepository
 *
 * Repository for raw analytics events with improved query patterns,
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
        ...this.buildMetricSelections([
          AnalyticsEventType.VIEW,
          AnalyticsEventType.PURCHASE,
          AnalyticsEventType.ADD_TO_CART,
        ]),
        ...this.buildValueSelections([AnalyticsEventType.PURCHASE]),
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
      revenue: parsed.purchasesValue || 0,
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
          AnalyticsEventType.VIEW,
          AnalyticsEventType.PURCHASE,
          AnalyticsEventType.ADD_TO_CART,
          AnalyticsEventType.CHECKOUT,
        ]),
        ...this.buildValueSelections([AnalyticsEventType.PURCHASE]),
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
      revenue: parsed.purchasesValue || 0,
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
      .addSelect('p.name', 'productName')
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
      .leftJoin('products', 'p', 'p.id = e.productId')
      .where('e.storeId = :storeId', { storeId })
      .andWhere('e.productId IS NOT NULL')
      .setParameters({
        view: this.eventTypeParams.view,
        purchase: this.eventTypeParams.purchase,
      });

    this.applyDateRange(qb, dateOptions);

    const results = await qb
      .groupBy('e.productId')
      .addGroupBy('p.name') // ✅ Add to GROUP BY
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
        name: r.productName || 'Unknown Product',
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

  async getRevenueTrends(storeId?: string, from?: string, to?: string) {
    const query = this.createQueryBuilder('event')
      .select('DATE(event.createdAt)', 'date')
      .addSelect('SUM(event.value)', 'revenue')
      .addSelect('COUNT(*)', 'transactions')
      .where('event.eventType = :type', { type: 'purchase' })
      .groupBy('DATE(event.createdAt)')
      .orderBy('date', 'ASC');

    if (storeId) query.andWhere('event.storeId = :storeId', { storeId });
    if (from) query.andWhere('event.createdAt >= :from', { from });
    if (to) query.andWhere('event.createdAt <= :to', { to });

    const results = await query.getRawMany();

    // Transform to camelCase
    return results.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue || '0'),
      transactions: parseInt(row.transactions || '0'),
    }));
  }

  async getFunnelData(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    const baseQuery = this.createQueryBuilder('event');

    if (storeId) baseQuery.andWhere('event.storeId = :storeId', { storeId });
    if (productId)
      baseQuery.andWhere('event.productId = :productId', { productId });
    if (from) baseQuery.andWhere('event.createdAt >= :from', { from });
    if (to) baseQuery.andWhere('event.createdAt <= :to', { to });

    return Promise.all([
      baseQuery
        .clone()
        .andWhere('event.eventType = :type', { type: 'view' })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('event.eventType = :type', { type: 'addToCart' })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('event.eventType = :type', { type: 'purchase' })
        .getCount(),
    ]);
  }

  async getEventsForUserJourney(
    storeId?: string,
    from?: string,
    to?: string
  ): Promise<EventUserJourney[]> {
    // Build base query
    const qb = this.createQueryBuilder('event')
      .select('event.userId', 'userId')
      .addSelect('event.eventType', 'eventType')
      .addSelect('event.productId', 'productId')
      .addSelect('event.createdAt', 'timestamp')
      .where('event.userId IS NOT NULL');

    if (storeId) {
      qb.andWhere('event.storeId = :storeId', { storeId });
    }
    if (from) {
      qb.andWhere('event.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('event.createdAt <= :to', { to });
    }

    qb.orderBy('event.userId', 'ASC')
      .addOrderBy('event.createdAt', 'ASC')
      .limit(10000); // Limit for performance

    return await qb.getRawMany();
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
