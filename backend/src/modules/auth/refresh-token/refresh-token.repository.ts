import { BaseRepository } from 'src/common/abstracts/base.repository';
import { RefreshToken } from 'src/entities/user/policy/refresh-token.entity';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  constructor(dataSource: DataSource) {
    super(RefreshToken, dataSource.createEntityManager());
  }
}
