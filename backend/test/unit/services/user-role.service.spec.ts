import { Test, TestingModule } from '@nestjs/testing';
import { UserRoleService } from 'src/modules/user/user-role/user-role.service';
import { UserRoleRepository } from 'src/modules/user/user-role/user-role.repository';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { mockRepository } from 'test/unit/utils/test-helpers';

describe('UserRoleService', () => {
  let service: UserRoleService;
  let repo: jest.Mocked<Partial<UserRoleRepository>>;

  beforeEach(async () => {
    repo = mockRepository<UserRoleRepository>(['findOne', 'save']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRoleService,
        { provide: UserRoleRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<UserRoleService>(UserRoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByStoreUser', () => {
    it('calls repository.findOne with correct where clause and returns role', async () => {
      const expected: Partial<UserRole> = {
        id: 'r1',
        roleName: 'STORE_ADMIN' as any,
      };
      (repo.findOne as jest.Mock).mockResolvedValue(expected);

      const res = await service.findByStoreUser('user1', 'store1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 'user1' },
          store: { id: 'store1' },
        },
      });
      expect(res).toEqual(expected);
    });

    it('returns null when repository returns null', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      const res = await service.findByStoreUser('u', 's');
      expect(res).toBeNull();
    });
  });

  describe('update', () => {
    it('updates role when exists and returns saved role', async () => {
      const existing: Partial<UserRole> = {
        id: 'r1',
        roleName: 'STORE_USER' as any,
        store: { id: 's1' } as any,
      } as any;
      (repo.findOne as jest.Mock).mockResolvedValue(existing);
      const saved = { ...existing, roleName: 'STORE_ADMIN' } as any;
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const res = await service.update('user1', {
        store: { id: 's1' } as any,
        roleName: 'STORE_ADMIN',
      } as any);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 'user1' },
          store: { id: 's1' },
        },
      });
      expect(repo.save).toHaveBeenCalledWith({
        ...existing,
        roleName: 'STORE_ADMIN',
      });
      expect(res).toEqual(saved);
    });

    it('throws NotFoundException when role does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update('user1', {
          store: { id: 's1' } as any,
          roleName: 'STORE_ADMIN',
        } as any)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
