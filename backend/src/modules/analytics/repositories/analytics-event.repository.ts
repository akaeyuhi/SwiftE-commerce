import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from '../entities/analytics-event.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

/**
 * AnalyticsEventRepository
 *
 * Raw events repository. Contains safer query-builder based aggregation helpers
 * used by the StatsService when daily aggregates are missing.
 */
@Injectable()
export class AnalyticsEventRepository extends BaseRepository<AnalyticsEvent> {
  constructor(dataSource: DataSource) {
    super(AnalyticsEvent, dataSource.createEntityManager());
  }

  /**
   * Aggregate events for a specific product in a date range.
   */
  async aggregateProductRange(
    productId: string,
    from?: string, // ISO date 'YYYY-MM-DD'
    to?: string
  ): Promise<{
    views: number;
    purchases: number;
    addToCarts: number;
    revenue: number;
  }> {
    const qb = this.createQueryBuilder('e')
      .select([
        `SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END) as views`,
        `SUM(CASE WHEN e.eventType = :purchase THEN 1 ELSE 0 END) as purchases`,
        `SUM(CASE WHEN e.eventType = :addToCart THEN 1 ELSE 0 END) as addToCarts`,
        `SUM(CASE WHEN e.eventType = :purchase THEN COALESCE(e.value,0) ELSE 0 END) as revenue`,
      ])
      .where('e.productId = :productId', { productId })
      .setParameter('view', AnalyticsEventType.VIEW)
      .setParameter('purchase', AnalyticsEventType.PURCHASE)
      .setParameter('addToCart', AnalyticsEventType.ADD_TO_CART);

    if (from)
      qb.andWhere('e.createdAt >= :from', { from: `${from}T00:00:00Z` });
    if (to) qb.andWhere('e.createdAt <= :to', { to: `${to}T23:59:59Z` });

    const raw = await qb.getRawOne();
    return {
      views: Number(raw?.views ?? 0),
      purchases: Number(raw?.purchases ?? 0),
      addToCarts: Number(raw?.addToCarts ?? 0),
      revenue: Number(raw?.revenue ?? 0),
    };
  }

  /**
   * Aggregate events for a specific store in a date range.
   */
  async aggregateStoreRange(
    storeId: string,
    from?: string,
    to?: string
  ): Promise<{
    views: number;
    purchases: number;
    addToCarts: number;
    revenue: number;
    checkouts: number;
  }> {
    const qb = this.createQueryBuilder('e')
      .select([
        `SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END) as views`,
        `SUM(CASE WHEN e.eventType = :purchase THEN 1 ELSE 0 END) as purchases`,
        `SUM(CASE WHEN e.eventType = :addToCart THEN 1 ELSE 0 END) as addToCarts`,
        `SUM(CASE WHEN e.eventType = :purchase THEN COALESCE(e.value,0) ELSE 0 END) as revenue`,
        `SUM(CASE WHEN e.eventType = :checkout THEN 1 ELSE 0 END) as checkouts`,
      ])
      .where('e.storeId = :storeId', { storeId })
      .setParameter('view', AnalyticsEventType.VIEW)
      .setParameter('purchase', AnalyticsEventType.PURCHASE)
      .setParameter('addToCart', AnalyticsEventType.ADD_TO_CART)
      .setParameter('checkout', AnalyticsEventType.CHECKOUT);

    if (from)
      qb.andWhere('e.createdAt >= :from', { from: `${from}T00:00:00Z` });
    if (to) qb.andWhere('e.createdAt <= :to', { to: `${to}T23:59:59Z` });

    const raw = await qb.getRawOne();
    return {
      views: Number(raw?.views ?? 0),
      purchases: Number(raw?.purchases ?? 0),
      addToCarts: Number(raw?.addToCarts ?? 0),
      revenue: Number(raw?.revenue ?? 0),
      checkouts: Number(raw?.checkouts ?? 0),
    };
  }

  /**
   * Top products by conversion (purchases/views) using raw events.
   * Returns rows: { productId, views, purchases, revenue, conversionRate }
   */
  async topProductsByConversion(
    storeId: string,
    from?: string,
    to?: string,
    limit = 10
  ): Promise<
    {
      productId: string;
      views: number;
      purchases: number;
      revenue: number;
      conversionRate: number;
    }[]
  > {
    const qb = this.createQueryBuilder('e')
      .select('e.productId', 'productId')
      .addSelect(
        `SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END)`,
        'views'
      )
      .addSelect(
        `SUM(CASE WHEN e.eventType = :purchase THEN 1 ELSE 0 END)`,
        'purchases'
      )
      .addSelect(
        `SUM(CASE WHEN e.eventType = :purchase THEN COALESCE(e.value,0) ELSE 0 END)`,
        'revenue'
      )
      .where('e.storeId = :storeId', { storeId })
      .andWhere('e.productId IS NOT NULL')
      .setParameter('view', AnalyticsEventType.VIEW)
      .setParameter('purchase', AnalyticsEventType.PURCHASE);

    if (from)
      qb.andWhere('e.createdAt >= :from', { from: `${from}T00:00:00Z` });
    if (to) qb.andWhere('e.createdAt <= :to', { to: `${to}T23:59:59Z` });

    qb.groupBy('e.productId')
      .having(`SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END) > 0`)
      .orderBy(
        `(SUM(CASE WHEN e.eventType = :purchase THEN 1 ELSE 0 END)::float / ` +
          `
        NULLIF(SUM(CASE WHEN e.eventType = :view THEN 1 ELSE 0 END),0)::float)`,
        'DESC'
      )
      .limit(limit);

    const raw = await qb.getRawMany();
    return raw.map((r: any) => {
      const v = Number(r.views || 0);
      const p = Number(r.purchases || 0);
      return {
        productId: r.productId,
        views: v,
        purchases: p,
        revenue: Number(r.revenue || 0),
        conversionRate: v > 0 ? p / v : 0,
      };
    });
  }

  async insertMany(events: Partial<AnalyticsEvent>[]) {
    if (!events || events.length === 0) return;
    // Use query builder insert for faster bulk writes
    await this.manager
      .createQueryBuilder()
      .insert()
      .into(AnalyticsEvent)
      .values(events)
      .execute();
  }
}
