import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { AiLog } from 'src/entities/ai-log.entity';

@Injectable()
export class AiLogRepository extends BaseRepository<AiLog> {
  constructor(dataSource: DataSource) {
    super(AiLog, dataSource.createEntityManager());
  }
}
