import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { AiLog } from 'src/entities/store/ai-log.entity';

/**
 * AiLogRepository
 *
 * Thin wrapper around BaseRepository for AiLog-specific queries you may add later.
 */
@Injectable()
export class AiLogRepository extends BaseRepository<AiLog> {
  constructor(dataSource: DataSource) {
    super(AiLog, dataSource.createEntityManager());
  }

  /**
   * Find logs by simple filter. Adds optional pagination.
   */
  async findByFilter(
    filter: { storeId?: string; userId?: string; feature?: string },
    limit = 100,
    offset = 0
  ) {
    const qb = this.createQueryBuilder('l')
      .leftJoinAndSelect('l.user', 'u')
      .leftJoinAndSelect('l.store', 's')
      .orderBy('l.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (filter.storeId)
      qb.andWhere('s.id = :storeId', { storeId: filter.storeId });
    if (filter.userId) qb.andWhere('u.id = :userId', { userId: filter.userId });
    if (filter.feature)
      qb.andWhere('l.feature = :feature', { feature: filter.feature });

    return qb.getMany();
  }
}
