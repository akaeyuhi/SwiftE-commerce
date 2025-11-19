import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseAnalyticsRepository } from 'src/common/abstracts/analytics/base.analytics.repository';
import { ProductDailyStats } from 'src/entities/infrastructure/analytics/product-daily-stats.entity';
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

    this.applyDateRange(qb, options, 'date');

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
      ...this.parseAggregationResult(r),
      productId: r.productId,
    }));
  }

  async getUnderperformingProducts(
    storeId: string,
    from?: string,
    to?: string
  ) {
    const qb = this.createQueryBuilder('stats')
      .leftJoin('products', 'p', 'p.id = stats.productId')
      .select('stats.productId', 'id')
      .addSelect('p.name', 'name')
      .addSelect('SUM(stats.views)', 'views')
      .addSelect('SUM(stats.purchases)', 'purchases')
      .addSelect('SUM(stats.revenue)', 'revenue')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.deletedAt IS NULL')
      .groupBy('stats.productId')
      .addGroupBy('p.name');

    if (from && to) {
      qb.andWhere('stats.date BETWEEN :from AND :to', { from, to });
    }

    return await qb.getRawMany();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getAggregatedMetrics instead
   */
  async getAggregateRange(productId: string, from?: string, to?: string) {
    return this.getAggregatedMetrics(productId, { from, to });
  }

  async getCategorySales(storeId: string, options: DateRangeOptions = {}) {
    const qb = this.createQueryBuilder('stats')
      .innerJoin('products', 'p', 'p.id = stats.productId')
      .innerJoin('product_categories', 'pc', 'pc.product_id = p.id')
      .innerJoin('categories', 'c', 'c.id = pc.category_id')
      .select('c.name', 'name')
      .addSelect('SUM(stats.revenue)', 'revenue')
      .where('p.storeId = :storeId', { storeId })
      .groupBy('c.name')
      .orderBy('revenue', 'DESC');

    this.applyDateRange(qb, options, 'date');

    const raw = await qb.getRawMany();
    return raw.map((r) => ({
      name: r.name,
      revenue: parseFloat(r.revenue || '0'),
    }));
  }
}
