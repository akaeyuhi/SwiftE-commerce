import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductDailyStats } from '../entities/product-daily-stats.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductDailyStatsRepository extends BaseRepository<ProductDailyStats> {
  constructor(dataSource: DataSource) {
    super(ProductDailyStats, dataSource.createEntityManager());
  }

  /**
   * Sum aggregated columns for product in a date range using QueryBuilder.
   */
  async getAggregateRange(productId: string, from?: string, to?: string) {
    const qb = this.createQueryBuilder('p')
      .select([
        'COALESCE(SUM(p.views),0) as views',
        'COALESCE(SUM(p.purchases),0) as purchases',
        'COALESCE(SUM(p.addToCarts),0) as addToCarts',
        'COALESCE(SUM(p.revenue),0) as revenue',
      ])
      .where('p.productId = :productId', { productId });

    if (from) qb.andWhere('p.date >= :from', { from });
    if (to) qb.andWhere('p.date <= :to', { to });

    const raw = await qb.getRawOne();
    return {
      views: Number(raw?.views ?? 0),
      purchases: Number(raw?.purchases ?? 0),
      addToCarts: Number(raw?.addToCarts ?? 0),
      revenue: Number(raw?.revenue ?? 0),
    };
  }
}
