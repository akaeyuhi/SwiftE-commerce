import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { AiAudit } from 'src/entities/ai/ai-audit.entity';

@Injectable()
export class AiAuditRepository extends BaseRepository<AiAudit> {
  constructor(dataSource: DataSource) {
    super(AiAudit, dataSource.createEntityManager());
  }

  /**
   * find audits with simple filters for admin/owners
   */
  async findByFilter(
    filter: { storeId?: string; userId?: string; feature?: string },
    limit = 100,
    offset = 0
  ) {
    const qb = this.createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.store', 's')
      .orderBy('a.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (filter.storeId)
      qb.andWhere('s.id = :storeId', { storeId: filter.storeId });
    if (filter.userId) qb.andWhere('u.id = :userId', { userId: filter.userId });
    if (filter.feature)
      qb.andWhere('a.feature = :feature', { feature: filter.feature });

    return qb.getMany();
  }
}
