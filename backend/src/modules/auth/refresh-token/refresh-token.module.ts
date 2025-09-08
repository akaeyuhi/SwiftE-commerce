import { Module } from '@nestjs/common';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';

@Module({
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
