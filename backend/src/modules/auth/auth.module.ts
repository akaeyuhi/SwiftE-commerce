import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthJwtStrategy } from 'src/modules/auth/strategies/auth-jwt.strategy';
import { RefreshTokenStrategy } from 'src/modules/auth/strategies/auth-refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from 'src/entities/user/policy/refresh-token.entity';
import { RefreshTokenModule } from 'src/modules/auth/refresh-token/refresh-token.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { AdminService } from 'src/modules/auth/admin/admin.service';
import { AdminModule } from 'src/modules/auth/admin/admin.module';
import { ConfirmationModule } from './confirmation/confirmation.module';
import { EmailModule } from 'src/modules/email/email.module';
import { ConfirmationService } from 'src/modules/auth/confirmation/confirmation.service';
import { UserRoleModule } from 'src/modules/user/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    ConfigModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),

    RefreshTokenModule,
    AdminModule,
    ConfirmationModule,
    EmailModule,
    UserModule,
    PolicyModule,
    UserRoleModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthJwtStrategy,
    RefreshTokenStrategy,
    RefreshTokenService,
    AdminService,
    ConfirmationService,
  ],
  exports: [RefreshTokenService],
})
export class AuthModule {}
