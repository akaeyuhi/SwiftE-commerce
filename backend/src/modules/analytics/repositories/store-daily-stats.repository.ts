// src/modules/analytics/repositories/store-daily-stats.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StoreDailyStats } from '../entities/store-daily-stats.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class StoreDailyStatsRepository extends BaseRepository<StoreDailyStats> {
  constructor(dataSource: DataSource) {
    super(StoreDailyStats, dataSource.createEntityManager());
  }

  async getAggregateRange(storeId: string, from?: string, to?: string) {
    const qb = this.createQueryBuilder('s')
      .select([
        'COALESCE(SUM(s.views),0) as views',
        'COALESCE(SUM(s.purchases),0) as purchases',
        'COALESCE(SUM(s.addToCarts),0) as addToCarts',
        'COALESCE(SUM(s.revenue),0) as revenue',
        'COALESCE(SUM(s.checkouts),0) as checkouts',
      ])
      .where('s.storeId = :storeId', { storeId });

    if (from) qb.andWhere('s.date >= :from', { from });
    if (to) qb.andWhere('s.date <= :to', { to });

    const raw = await qb.getRawOne();
    return {
      views: Number(raw?.views ?? 0),
      purchases: Number(raw?.purchases ?? 0),
      addToCarts: Number(raw?.addToCarts ?? 0),
      revenue: Number(raw?.revenue ?? 0),
      checkouts: Number(raw?.checkouts ?? 0),
    };
  }
}
