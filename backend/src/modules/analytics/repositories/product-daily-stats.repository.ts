import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductDailyStats } from '../entities/product-daily-stats.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class ProductDailyStatsRepository extends BaseRepository<ProductDailyStats> {
  constructor(dataSource: DataSource) {
    super(ProductDailyStats, dataSource.createEntityManager());
  }
}
