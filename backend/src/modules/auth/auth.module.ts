import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthJwtStrategy } from 'src/modules/auth/strategies/auth-jwt.strategy';
import { RefreshTokenStrategy } from 'src/modules/auth/strategies/auth-refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from 'src/entities/user/policy/refresh-token.entity';
import { RefreshTokenModule } from 'src/modules/auth/refresh-token/refresh-token.module';
import { ConfigModule } from '@nestjs/config';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';
import { AuthAdapterModule } from 'src/modules/auth-adapter/auth-adapter.module';
import { AdminService } from 'src/modules/auth/admin/admin.service';
import { AdminModule } from 'src/modules/auth/admin/admin.module';
import { UserModule } from 'src/modules/user/user.module';
import { ConfirmationModule } from './confirmation/confirmation.module';
import { EmailModule } from 'src/modules/email/email.module';
import { ConfirmationService } from 'src/modules/auth/confirmation/confirmation.service';
import { UserRoleModule } from 'src/modules/user/user-role/user-role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    RefreshTokenModule,
    AdminModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthAdapterModule),
    forwardRef(() => PolicyModule),
    ConfirmationModule,
    EmailModule,
    UserRoleModule,
    ConfigModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthJwtStrategy,
    RefreshTokenStrategy,
    RefreshTokenService,
    PolicyService,
    AdminService,
    ConfirmationService,
  ],
  exports: [PolicyService, AdminService, RefreshTokenService],
})
export class AuthModule {}
