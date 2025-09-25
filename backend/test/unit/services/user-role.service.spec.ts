import { Test, TestingModule } from '@nestjs/testing';
import { UserRoleService } from 'src/modules/user/user-role/user-role.service';
import { UserRoleRepository } from 'src/modules/user/user-role/user-role.repository';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { createRepositoryMock, MockedMethods } from 'test/unit/utils/helpers';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

describe('UserRoleService', () => {
  let service: UserRoleService;
  let repo: Partial<MockedMethods<UserRoleRepository>>;

  beforeEach(async () => {
    repo = createRepositoryMock<UserRoleRepository>(['findOne', 'save']);

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
      const expected = {
        id: 'r1',
        roleName: StoreRoles.ADMIN,
      } as UserRole;
      repo.findOne!.mockResolvedValue(expected);

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
      repo.findOne!.mockResolvedValue(null);
      const res = await service.findByStoreUser('u', 's');
      expect(res).toBeNull();
    });
  });

  describe('update', () => {
    it('updates role when exists and returns saved role', async () => {
      const existing = {
        id: 'r1',
        roleName: StoreRoles.GUEST,
        store: { id: 's1' },
      } as UserRole;
      repo.findOne!.mockResolvedValue(existing);
      const saved = { ...existing, roleName: StoreRoles.ADMIN };
      repo.save!.mockResolvedValue(saved);

      const res = await service.update('user1', {
        store: { id: 's1' },
        roleName: StoreRoles.ADMIN,
      } as any);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 'user1' },
          store: { id: 's1' },
        },
      });
      expect(repo.save).toHaveBeenCalledWith({
        ...existing,
        roleName: StoreRoles.ADMIN,
      });
      expect(res).toEqual(saved);
    });

    it('throws NotFoundException when role does not exist', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(
        service.update('user1', {
          store: { id: 's1' },
          roleName: 'STORE_ADMIN',
        } as UserRole)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
