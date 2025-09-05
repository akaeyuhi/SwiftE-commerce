import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthJwtStrategy } from 'src/modules/auth/strategies/auth-jwt.strategy';
import { RefreshTokenStrategy } from 'src/modules/auth/strategies/auth-refresh.strategy';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import { RefreshTokenModule } from 'src/modules/refresh-token/refresh-token.module';
import { ConfigModule } from '@nestjs/config';
import { PolicyService } from './policy/policy.service';
import { AdminModule } from 'src/modules/admin/admin.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    JwtAuthGuard,
    TypeOrmModule.forFeature([RefreshToken]),
    RefreshTokenModule,
    ConfigModule,
    AdminModule,
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthJwtStrategy,
    RefreshTokenStrategy,
    PolicyService,
  ],
})
export class AuthModule {}
