import { Test, TestingModule } from '@nestjs/testing';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoleRepository } from 'src/modules/store/store-role/store-role.repository';
import { NotFoundException } from '@nestjs/common';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { createRepositoryMock, MockedMethods } from 'test/unit/utils/helpers';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

describe('StoreRoleService', () => {
  let service: StoreRoleService;
  let repo: Partial<MockedMethods<StoreRoleRepository>>;

  beforeEach(async () => {
    repo = createRepositoryMock<StoreRoleRepository>(['findOne', 'save']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreRoleService,
        { provide: StoreRoleRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<StoreRoleService>(StoreRoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByStoreUser', () => {
    it('calls repository.findOne with correct where clause and returns role', async () => {
      const expected = {
        id: 'r1',
        roleName: StoreRoles.ADMIN,
      } as StoreRole;
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
      } as StoreRole;
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
        } as StoreRole)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
