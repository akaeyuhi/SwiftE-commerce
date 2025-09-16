import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PredictorStat } from 'src/modules/predictor/entities/predictor-stats.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';

@Injectable()
export class PredictorRepository extends BaseRepository<PredictorStat> {
  constructor(dataSource: DataSource) {
    super(PredictorStat, dataSource.createEntityManager());
  }
}
