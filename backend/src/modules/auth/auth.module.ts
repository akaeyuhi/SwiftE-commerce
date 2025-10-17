import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthJwtStrategy } from 'src/modules/auth/strategies/auth-jwt.strategy';
import { RefreshTokenStrategy } from 'src/modules/auth/strategies/auth-refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from 'src/entities/user/authentication/refresh-token.entity';
import { RefreshTokenModule } from 'src/modules/auth/refresh-token/refresh-token.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { AdminModule } from 'src/modules/admin/admin.module';
import { ConfirmationModule } from './confirmation/confirmation.module';
import { EmailModule } from 'src/modules/email/email.module';
import { ConfirmationService } from 'src/modules/auth/confirmation/confirmation.service';
import { StoreRoleModule } from 'src/modules/store/store-role/store-role.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    RefreshTokenModule,
    AdminModule,
    ConfirmationModule,
    EmailModule,
    UserModule,
    StoreRoleModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthJwtStrategy,
    RefreshTokenStrategy,
    RefreshTokenService,
    ConfirmationService,
  ],
  exports: [RefreshTokenService],
})
export class AuthModule {}
