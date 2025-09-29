import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenStrategy } from 'src/modules/auth/strategies/auth-refresh.strategy';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { UserService } from 'src/modules/user/user.service';

import { UnauthorizedException } from '@nestjs/common';
import {
  createMock,
  createMockExecutionContext,
  createServiceMock,
  MockedMethods,
} from 'test/unit/utils/helpers';
import { User } from 'src/entities/user/user.entity';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;
  let config: Partial<MockedMethods<ConfigService>>;
  let rtSvc: Partial<MockedMethods<RefreshTokenService>>;
  let userSvc: Partial<MockedMethods<UserService>>;

  const payload = { id: 'u1', sub: 'u1', email: 'e' };

  beforeEach(async () => {
    config = createMock<ConfigService>(['get']);
    config.get!.mockReturnValue('secret-refresh');
    rtSvc = createMock<RefreshTokenService>(['findByToken']);
    userSvc = createServiceMock<UserService>(['findOneWithRelations']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenStrategy,
        { provide: ConfigService, useValue: config },
        { provide: RefreshTokenService, useValue: rtSvc },
        { provide: UserService, useValue: userSvc },
      ],
    }).compile();

    strategy = module.get(RefreshTokenStrategy);
  });

  it('extractTokenFromRequest returns body token', () => {
    const ctx = createMockExecutionContext({ body: { refreshToken: 't' } });
    const req = ctx.switchToHttp().getRequest();
    expect((strategy as any).extractTokenFromRequest(req)).toBe('t');
  });

  it('throws if no token', async () => {
    const ctx = createMockExecutionContext();
    const req = ctx.switchToHttp().getRequest();
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('throws when token not found', async () => {
    const req = { cookies: { refreshToken: 't' } } as any;
    rtSvc.findByToken!.mockResolvedValue(null);
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('throws when banned', async () => {
    const req = { cookies: { refreshToken: 't' } } as any;
    rtSvc.findByToken!.mockResolvedValue({
      user: { id: 'u1' },
      isBanned: true,
    } as any);
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('throws when userId mismatch', async () => {
    const req = { cookies: { refreshToken: 't' } } as any;
    rtSvc.findByToken!.mockResolvedValue({
      user: { id: 'u2' },
      isBanned: false,
    } as any);
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('throws when user not found', async () => {
    const req = { cookies: { refreshToken: 't' } } as any;
    rtSvc.findByToken!.mockResolvedValue({
      user: { id: 'u1' },
      isBanned: false,
    } as any);
    userSvc.findOneWithRelations!.mockResolvedValue(null as unknown as User);
    await expect(strategy.validate(req, payload)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('returns user when all checks pass', async () => {
    const req = { cookies: { refreshToken: 't' } } as any;
    const user = { id: 'u1', passwordHash: 'x' };
    rtSvc.findByToken!.mockResolvedValue({ user, isBanned: false } as any);
    userSvc.findOneWithRelations!.mockResolvedValue(user as any);
    const result = await strategy.validate(req, payload);
    expect(result).toEqual(user);
  });
});
