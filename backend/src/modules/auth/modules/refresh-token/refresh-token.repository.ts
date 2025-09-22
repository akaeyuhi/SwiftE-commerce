import { BaseRepository } from 'src/common/abstracts/base.repository';
import { RefreshToken } from 'src/entities/user/policy/refresh-token.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {}
