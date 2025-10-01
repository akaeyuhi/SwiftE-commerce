import { Test } from '@nestjs/testing';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { RefreshTokenRepository } from 'src/modules/auth/refresh-token/refresh-token.repository';
import { createRepositoryMock, MockedMethods } from 'test/unit/utils/helpers';
import { RefreshToken } from 'src/entities/user/policy/refresh-token.entity';
import { User } from 'src/entities/user/user.entity';

describe('RefreshTokenService', () => {
  let svc: RefreshTokenService;
  let repo: Partial<MockedMethods<RefreshTokenRepository>>;
  let mockRT: RefreshToken;
  let hash: string;
  const rawToken = 'tok123';

  beforeEach(async () => {
    hash = (await import('crypto'))
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    mockRT = {
      id: 'r1',
      tokenHash: hash,
      user: { id: 'u1' } as User,
      lastUsedAt: new Date(),
    } as RefreshToken;

    repo = createRepositoryMock<RefreshTokenRepository>([
      'save',
      'findOne',
      'count',
      'delete',
      'update',
    ]);
    const mod = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: RefreshTokenRepository, useValue: repo },
      ],
    }).compile();
    svc = mod.get<RefreshTokenService>(RefreshTokenService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('hashes token and saves', async () => {
      (repo.save as jest.Mock).mockResolvedValue(mockRT);
      const res = await svc.create({
        userId: 'u1',
        token: rawToken,
        deviceId: 'd',
        ip: 'ip',
        userAgent: 'ua',
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: hash,
          user: { id: 'u1' },
          deviceId: 'd',
          ip: 'ip',
          userAgent: 'ua',
        })
      );
      expect(res).toEqual(mockRT);
    });
  });

  describe('findByToken', () => {
    it('finds by hashed token', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockRT);
      const res = await svc.findByToken(rawToken);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: hash },
        relations: ['user'],
      });
      expect(res).toEqual(mockRT);
    });
  });

  describe('isTokenExists', () => {
    it('returns true when count >0', async () => {
      (repo.count as jest.Mock).mockResolvedValue(2);
      await expect(svc.isTokenExists(rawToken)).resolves.toBe(true);
    });
    it('returns false when count=0', async () => {
      (repo.count as jest.Mock).mockResolvedValue(0);
      await expect(svc.isTokenExists(rawToken)).resolves.toBe(false);
    });
  });

  describe('removeByValue', () => {
    it('deletes by hash', async () => {
      await svc.removeByValue(rawToken);
      expect(repo.delete).toHaveBeenCalledWith({ tokenHash: hash });
    });
  });

  describe('toggleBan', () => {
    it('returns null if none', async () => {
      jest.spyOn(svc, 'findByToken').mockResolvedValue(null);
      await expect(svc.toggleBan(rawToken)).resolves.toBeNull();
    });
    it('flips isBanned and saves', async () => {
      const rt = { ...mockRT, isBanned: false } as any;
      jest.spyOn(svc, 'findByToken').mockResolvedValue(rt);
      (repo.save as jest.Mock).mockResolvedValue({ ...rt, isBanned: true });
      const res = await svc.toggleBan(rawToken);
      expect(rt.isBanned).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(rt);
      expect(res!.isBanned).toBe(true);
    });
  });

  describe('touch', () => {
    it('updates lastUsedAt', async () => {
      await svc.touch(rawToken);
      expect(repo.update).toHaveBeenCalledWith(
        { tokenHash: hash },
        expect.any(Object)
      );
    });
  });
});
