import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseAnalyticsRepository } from 'src/common/abstracts/analytics/base.analytics.repository';
import { StoreDailyStats } from 'src/entities/infrastructure/analytics/store-daily-stats.entity';
import { DateRangeOptions } from 'src/common/interfaces/infrastructure/analytics.interface';

@Injectable()
export class StoreDailyStatsRepository extends BaseAnalyticsRepository<StoreDailyStats> {
  constructor(dataSource: DataSource) {
    super(StoreDailyStats, dataSource.createEntityManager());
  }

  /**
   * Get aggregated metrics for a store across date range
   */
  async getAggregatedMetrics(storeId: string, options: DateRangeOptions = {}) {
    const qb = this.createQueryBuilder('s')
      .select([
        'COALESCE(SUM(s.views), 0) as views',
        'COALESCE(SUM(s.purchases), 0) as purchases',
        'COALESCE(SUM(s.addToCarts), 0) as addToCarts',
        'COALESCE(SUM(s.revenue), 0) as revenue',
        'COALESCE(SUM(s.checkouts), 0) as checkouts',
      ])
      .where('s.storeId = :storeId', { storeId });

    this.applyDateRange(qb, options, 's.date');

    const raw = await qb.getRawOne();

    // Handle empty result
    if (!raw || Object.keys(raw).length === 0) {
      return {
        views: 0,
        purchases: 0,
        addToCarts: 0,
        revenue: 0,
        checkouts: 0,
      };
    }

    return this.parseAggregationResult(raw);
  }

  /**
   * Get daily timeseries data for a store
   */
  async getDailyTimeseries(
    storeId: string,
    options: DateRangeOptions = {}
  ): Promise<StoreDailyStats[]> {
    const qb = this.createQueryBuilder('s')
      .where('s.storeId = :storeId', { storeId })
      .orderBy('s.date', 'ASC');

    this.applyDateRange(qb, options, 's.date');

    return qb.getMany();
  }

  /**
   * Get top performing stores by various metrics
   */
  async getTopStores(
    metric: 'revenue' | 'views' | 'purchases' | 'conversionRate' = 'revenue',
    options: DateRangeOptions & { limit?: number } = {}
  ) {
    const { limit = 10, ...dateOptions } = options;

    const qb = this.createQueryBuilder('s')
      .select([
        's.storeId',
        'SUM(s.views) as views',
        'SUM(s.purchases) as purchases',
        'SUM(s.revenue) as revenue',
        `CASE WHEN SUM(s.views) > 0 THEN SUM(s.purchases)::float / SUM(s.views)::float ELSE 0 END as conversionRate`,
      ])
      .groupBy('s.storeId');

    this.applyDateRange(qb, dateOptions, 's.date');

    // Order by the specified metric
    switch (metric) {
      case 'conversionRate':
        qb.orderBy('conversionRate', 'DESC');
        break;
      default:
        qb.orderBy(`SUM(s.${metric})`, 'DESC');
    }

    const raw = await qb.limit(limit).getRawMany();

    return raw.map((r) => ({
      storeId: r.storeId,
      views: Number(r.views) || 0,
      purchases: Number(r.purchases) || 0,
      revenue: Number(r.revenue) || 0,
      conversionRate: Number(r.conversionRate) || 0,
    }));
  }

  async getTopStoreDaily(from: string, to: string, limit = 10) {
    const qb = this.createQueryBuilder('stats')
      .select('stats.storeId', 'storeId')
      .addSelect('SUM(stats.views)', 'totalViews')
      .addSelect('SUM(stats.purchases)', 'totalPurchases')
      .addSelect('SUM(stats.revenue)', 'totalRevenue')
      .addSelect('SUM(stats.addToCarts)', 'totalAddToCarts')
      .groupBy('stats.storeId');

    if (from && to) {
      qb.where('stats.date BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.where('stats.date >= :from', { from });
    } else if (to) {
      qb.where('stats.date <= :to', { to });
    }

    return await qb.orderBy('totalRevenue', 'DESC').limit(limit).getRawMany();
  }

  async getUnderperformingStores(from?: string, to?: string) {
    const qb = this.createQueryBuilder('stats')
      .leftJoin('stores', 's', 's.id = stats.storeId')
      .select('stats.storeId', 'id')
      .addSelect('s.name', 'name')
      .addSelect('SUM(stats.views)', 'views')
      .addSelect('SUM(stats.purchases)', 'purchases')
      .addSelect('SUM(stats.revenue)', 'revenue')
      .groupBy('stats.storeId')
      .addGroupBy('s.name');

    if (from && to) {
      qb.andWhere('stats.date BETWEEN :from AND :to', { from, to });
    }

    return await qb.getRawMany();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getAggregatedMetrics instead
   */
  async getAggregateRange(storeId: string, from?: string, to?: string) {
    return this.getAggregatedMetrics(storeId, { from, to });
  }
}
