import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class AiPredictorRepository extends BaseRepository<AiPredictorStat> {
  constructor(dataSource: DataSource) {
    super(AiPredictorStat, dataSource.createEntityManager());
  }
}
