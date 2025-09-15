import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StoreDailyStats } from '../entities/store-daily-stats.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class StoreDailyStatsRepository extends BaseRepository<StoreDailyStats> {
  constructor(dataSource: DataSource) {
    super(StoreDailyStats, dataSource.createEntityManager());
  }
}
