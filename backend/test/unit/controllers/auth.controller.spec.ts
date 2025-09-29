import { Test } from '@nestjs/testing';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { Request, Response } from 'express';
import { createMock, MockedMethods } from '../utils/helpers';

describe('AuthController', () => {
  let ctrl: AuthController;
  let svc: Partial<MockedMethods<AuthService>>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const tokens = {
    accessToken: 'a',
    refreshToken: 'r',
    csrfToken: 'c',
    user: { id: 'u', email: 'e' } as any,
  };

  beforeEach(async () => {
    svc = createMock<AuthService>([
      'register',
      'login',
      'refreshAccessToken',
      'banRefresh',
    ]);
    req = {
      ip: '1.1.1.1',
      headers: { 'user-agent': 'ua', 'x-device-id': 'did' },
      cookies: { refreshToken: 'r' },
    } as any;
    res = {
      cookie: jest.fn(),
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      clearCookie: jest.fn(),
    } as any;

    const mod = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: svc }],
    }).compile();

    ctrl = mod.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('register sets cookies and returns user', async () => {
    svc.register!.mockResolvedValue(tokens as any);
    await ctrl.register({} as any, req as any, res as any);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'a',
      user: tokens.user,
    });
  });

  it('login sets cookies and returns user', async () => {
    svc.login!.mockResolvedValue(tokens as any);
    await ctrl.login({} as any, req as any, res as any);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'a',
      user: tokens.user,
    });
  });

  it('refresh denies on bad CSRF', async () => {
    req.headers!['x-csrf-token'] = 'x';
    req.cookies = { 'XSRF-TOKEN': 'y' };
    await ctrl.refresh(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  it('logout bans and clears cookies', async () => {
    svc.banRefresh!.mockResolvedValue(undefined as any);
    await ctrl.logout(req as any, res as any, { refreshToken: 'r' } as any);
    expect(svc.banRefresh).toHaveBeenCalledWith('r');
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
