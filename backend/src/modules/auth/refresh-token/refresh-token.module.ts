import { Module } from '@nestjs/common';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { RefreshTokenRepository } from 'src/modules/auth/refresh-token/refresh-token.repository';

@Module({
  providers: [RefreshTokenService, RefreshTokenRepository],
  exports: [RefreshTokenService, RefreshTokenRepository],
})
export class RefreshTokenModule {}
