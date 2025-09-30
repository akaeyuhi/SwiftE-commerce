import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseAnalyticsRepository } from 'src/common/abstracts/analytics/base.analytics.repository';
import { ProductDailyStats } from '../entities/product-daily-stats.entity';
import { DateRangeOptions } from 'src/common/interfaces/infrastructure/analytics.interface';

@Injectable()
export class ProductDailyStatsRepository extends BaseAnalyticsRepository<ProductDailyStats> {
  constructor(dataSource: DataSource) {
    super(ProductDailyStats, dataSource.createEntityManager());
  }

  /**
   * Get aggregated metrics for a product across date range
   */
  async getAggregatedMetrics(
    productId: string,
    options: DateRangeOptions = {}
  ) {
    const qb = this.createQueryBuilder('p')
      .select([
        'COALESCE(SUM(p.views), 0) as views',
        'COALESCE(SUM(p.purchases), 0) as purchases',
        'COALESCE(SUM(p.addToCarts), 0) as addToCarts',
        'COALESCE(SUM(p.revenue), 0) as revenue',
      ])
      .where('p.productId = :productId', { productId });

    this.applyDateRange(qb, options, 'p.date');

    const raw = await qb.getRawOne();
    return this.parseAggregationResult(raw);
  }

  /**
   * Get daily timeseries data for a product
   */
  async getDailyTimeseries(
    productId: string,
    options: DateRangeOptions = {}
  ): Promise<ProductDailyStats[]> {
    const qb = this.createQueryBuilder('p')
      .where('p.productId = :productId', { productId })
      .orderBy('p.date', 'ASC');

    this.applyDateRange(qb, options, 'p.date');

    return qb.getMany();
  }

  /**
   * Get comparative metrics for multiple products
   */
  async getComparativeMetrics(
    productIds: string[],
    options: DateRangeOptions = {}
  ) {
    if (!productIds.length) return [];

    const qb = this.createQueryBuilder('p')
      .select([
        'p.productId',
        'SUM(p.views) as views',
        'SUM(p.purchases) as purchases',
        'SUM(p.addToCarts) as addToCarts',
        'SUM(p.revenue) as revenue',
      ])
      .where('p.productId IN (:...productIds)', { productIds })
      .groupBy('p.productId');

    this.applyDateRange(qb, options, 'p.date');

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      productId: r.productId,
      ...this.parseAggregationResult(r),
    }));
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getAggregatedMetrics instead
   */
  async getAggregateRange(productId: string, from?: string, to?: string) {
    return this.getAggregatedMetrics(productId, { from, to });
  }
}
