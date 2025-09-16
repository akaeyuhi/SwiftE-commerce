import { Module } from '@nestjs/common';
import { RefreshTokenService } from 'src/modules/auth/modules/refresh-token/refresh-token.service';

@Module({
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
