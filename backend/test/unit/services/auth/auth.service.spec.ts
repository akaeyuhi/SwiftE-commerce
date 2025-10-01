import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/modules/auth/auth.service';
import { UserService } from 'src/modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createMock, createServiceMock } from 'test/unit/utils/helpers';
import { User } from 'src/entities/user/user.entity';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { UserDto } from 'src/modules/user/dto/user.dto';

describe('AuthService', () => {
  let svc: AuthService;
  const userSvc = createServiceMock<UserService>([
    'findByEmail',
    'findUserWithPassword',
    'create',
  ]);
  const jwtSvc = createMock<JwtService>(['signAsync']);
  const rtSvc = createMock<RefreshTokenService>([
    'create',
    'findByToken',
    'removeByValue',
    'toggleBan',
  ]);

  const rawToken = 'raw';

  const user = {
    id: 'u1',
    email: 'e@x.com',
    passwordHash: bcrypt.hashSync('pass', 10),
    firstName: 'F',
    lastName: 'L',
    siteRole: AdminRoles.USER,
  } as User;

  beforeEach(async () => {
    jwtSvc.signAsync!.mockResolvedValue('jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userSvc },
        { provide: JwtService, useValue: jwtSvc },
        { provide: RefreshTokenService, useValue: rtSvc },
      ],
    }).compile();

    svc = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('doesUserExists returns true/false', async () => {
    userSvc.findByEmail!.mockResolvedValue(user);
    await expect(
      svc.doesUserExists({ email: user.email } as any)
    ).resolves.toBe(true);

    userSvc.findByEmail!.mockResolvedValue(null as unknown as UserDto);
    await expect(
      svc.doesUserExists({ email: user.email } as any)
    ).resolves.toBe(false);
  });

  describe('login', () => {
    it('throws if user missing', async () => {
      userSvc.findUserWithPassword!.mockResolvedValue(null);
      await expect(
        svc.login({ email: 'e', password: 'p' } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws on invalid password', async () => {
      userSvc.findUserWithPassword!.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(
        svc.login({ email: user.email, password: 'wrong' } as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens + user', async () => {
      userSvc.findUserWithPassword!.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      rtSvc.create!.mockResolvedValue(undefined as any);

      const result = await svc.login(
        { email: user.email, password: 'pass' } as any,
        {
          ip: '127.0.0.1',
          headers: { 'user-agent': 'ua', 'x-device-id': 'did' },
        } as any
      );

      expect(jwtSvc.signAsync).toHaveBeenCalledTimes(2);
      expect(rtSvc.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user.id, token: expect.any(String) })
      );
      expect(result.user.email).toBe(user.email);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('csrfToken');
    });
  });

  describe('register', () => {
    it('throws on existing user', async () => {
      jest.spyOn(svc, 'doesUserExists').mockResolvedValue(true);
      await expect(
        svc.register({ email: user.email, password: 'pass' } as any)
      ).rejects.toThrow(ConflictException);
    });

    it('creates then logs in', async () => {
      jest.spyOn(svc, 'doesUserExists').mockResolvedValue(false);
      userSvc.create!.mockResolvedValue(user);
      jest.spyOn(svc, 'login').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        csrfToken: 'c',
        user,
      } as any);

      const res = await svc.register({
        email: user.email,
        password: 'pass',
      } as any);
      expect(userSvc.create).toHaveBeenCalledWith({
        email: user.email,
        password: 'pass',
      } as any);
      expect(res.user).toEqual(user);
    });
  });

  describe('refreshAccessToken', () => {
    it('throws on invalid token', async () => {
      rtSvc.findByToken!.mockResolvedValue(null);
      await expect(
        svc.refreshAccessToken(
          { id: user.id, email: user.email } as any,
          rawToken
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rotates token', async () => {
      rtSvc.findByToken!.mockResolvedValue({ user, isBanned: false } as any);
      rtSvc.removeByValue!.mockResolvedValue(undefined);
      jest.spyOn(svc as any, 'getTokens').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        csrfToken: 'c',
      });

      const out = await svc.refreshAccessToken(
        { id: user.id, email: user.email } as any,
        rawToken,
        {} as any
      );
      expect(rtSvc.removeByValue).toHaveBeenCalledWith(rawToken);
      expect(out).toEqual({
        accessToken: 'a',
        refreshToken: 'r',
        csrfToken: 'c',
      });
    });
  });

  it('banRefresh toggles ban', async () => {
    rtSvc.toggleBan!.mockResolvedValue({} as any);
    await svc.banRefresh(rawToken);
    expect(rtSvc.toggleBan).toHaveBeenCalledWith(rawToken);
  });
});
