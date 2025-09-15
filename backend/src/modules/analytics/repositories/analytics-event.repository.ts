import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class AnalyticsEventRepository extends BaseRepository<AnalyticsEvent> {
  constructor(dataSource: DataSource) {
    super(AnalyticsEvent, dataSource.createEntityManager());
  }

  async findRecentByStore(storeId: string, limit = 100) {
    return this.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
