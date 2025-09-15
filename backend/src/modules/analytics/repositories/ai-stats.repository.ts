import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiStat } from '../entities/ai-stat.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class AiStatsRepository extends BaseRepository<AiStat> {
  constructor(dataSource: DataSource) {
    super(AiStat, dataSource.createEntityManager());
  }
}
