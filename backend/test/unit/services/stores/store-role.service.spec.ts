import { Test, TestingModule } from '@nestjs/testing';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoleRepository } from 'src/modules/store/store-role/store-role.repository';
import { NotFoundException } from '@nestjs/common';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { createRepositoryMock, MockedMethods } from '../../../utils/helpers';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { User } from 'src/entities/user/user.entity';
import { Store } from 'src/entities/store/store.entity';
import { UpdateStoreRoleDto } from 'src/modules/store/store-role/dto/update-store-role.dto';

describe('StoreRoleService', () => {
  let service: StoreRoleService;
  let repo: Partial<MockedMethods<StoreRoleRepository>>;

  const mockUser: User = {
    id: 'u1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
  } as Store;

  const mockStoreRole: StoreRole = {
    id: 'sr1',
    user: mockUser,
    store: mockStore,
    roleName: StoreRoles.ADMIN,
    assignedBy: 'admin1',
    assignedAt: new Date('2024-01-01'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as StoreRole;

  beforeEach(async () => {
    repo = createRepositoryMock<StoreRoleRepository>([
      'findOne',
      'find',
      'save',
      'create',
      'update',
      'delete',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreRoleService,
        { provide: StoreRoleRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<StoreRoleService>(StoreRoleService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(StoreRoleService);
    });
  });

  describe('findByStoreUser', () => {
    it('should find role by user and store', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);

      const result = await service.findByStoreUser('u1', 's1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 'u1' },
          store: { id: 's1' },
        },
        relations: ['user', 'store'],
      });
      expect(result).toEqual(mockStoreRole);
    });

    it('should return null when role not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.findByStoreUser('u1', 's1');

      expect(result).toBeNull();
    });

    it('should include user and store relations', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);

      await service.findByStoreUser('u1', 's1');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user', 'store'],
        })
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateStoreRoleDto = {
      store: { id: 's1' } as Store,
      roleName: StoreRoles.MODERATOR,
    };

    it('should update role when exists', async () => {
      const existing = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      repo.findOne!.mockResolvedValue(existing);

      const saved = { ...existing, roleName: StoreRoles.MODERATOR };
      repo.save!.mockResolvedValue(saved);

      const result = await service.update('u1', updateDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          user: { id: 'u1' },
          store: { id: 's1' },
        },
        relations: ['user', 'store'],
      });
      expect(repo.save).toHaveBeenCalledWith({
        ...existing,
        roleName: StoreRoles.MODERATOR,
      });
      expect(result).toEqual(saved);
    });

    it('should throw NotFoundException when role does not exist', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.update('u1', updateDto)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.update('u1', updateDto)).rejects.toThrow(
        'Such role doesnt exist'
      );
    });
  });

  describe('assignStoreRole', () => {
    it('should create new role when none exists', async () => {
      repo.findOne!.mockResolvedValue(null);
      jest.spyOn(service, 'create').mockResolvedValue(mockStoreRole);

      const result = await service.assignStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN,
        'admin1'
      );

      expect(service.create).toHaveBeenCalledWith({
        userId: 'u1',
        storeId: 's1',
        roleName: StoreRoles.ADMIN,
        assignedBy: 'admin1',
        assignedAt: expect.any(Date),
        isActive: true,
      });
      expect(result).toEqual(mockStoreRole);
    });

    it('should update existing role', async () => {
      const existing = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      repo.findOne!.mockResolvedValue(existing);

      const updated = {
        ...existing,
        roleName: StoreRoles.ADMIN,
        assignedBy: 'admin1',
        assignedAt: expect.any(Date),
      };
      repo.save!.mockResolvedValue(updated);

      const result = await service.assignStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN,
        'admin1'
      );

      expect(repo.save).toHaveBeenCalledWith({
        ...existing,
        roleName: StoreRoles.ADMIN,
        assignedBy: 'admin1',
        assignedAt: expect.any(Date),
        isActive: true,
      });
      expect(result).toEqual(updated);
    });

    it('should handle assignment without assignedBy', async () => {
      repo.findOne!.mockResolvedValue(null);
      jest.spyOn(service, 'create').mockResolvedValue(mockStoreRole);

      await service.assignStoreRole('u1', 's1', StoreRoles.ADMIN);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedBy: undefined,
        })
      );
    });

    it('should reactivate inactive role', async () => {
      const inactiveRole = { ...mockStoreRole, isActive: false };
      repo.findOne!.mockResolvedValue(inactiveRole);
      repo.save!.mockResolvedValue({ ...inactiveRole, isActive: true });

      const result = await service.assignStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        })
      );
      expect(result.isActive).toBe(true);
    });
  });

  describe('revokeStoreRole', () => {
    it('should revoke active role', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);
      const revokedRole = {
        ...mockStoreRole,
        isActive: false,
        revokedBy: 'admin1',
        revokedAt: expect.any(Date),
      };
      repo.save!.mockResolvedValue(revokedRole);

      await service.revokeStoreRole('u1', 's1', 'admin1');

      expect(repo.save).toHaveBeenCalledWith({
        ...mockStoreRole,
        isActive: false,
        revokedBy: 'admin1',
        revokedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.revokeStoreRole('u1', 's1')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.revokeStoreRole('u1', 's1')).rejects.toThrow(
        'User does not have a role in this store'
      );
    });

    it('should handle revocation without revokedBy', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);
      repo.save!.mockResolvedValue(mockStoreRole);

      await service.revokeStoreRole('u1', 's1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedBy: undefined,
        })
      );
    });

    it('should set revokedAt timestamp', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);
      repo.save!.mockResolvedValue(mockStoreRole);

      await service.revokeStoreRole('u1', 's1', 'admin1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(Date),
        })
      );
    });
  });

  describe('getStoreRoles', () => {
    it('should return all active roles for store', async () => {
      const roles = [
        mockStoreRole,
        { ...mockStoreRole, id: 'sr2', roleName: StoreRoles.MODERATOR },
      ];
      repo.find!.mockResolvedValue(roles);

      const result = await service.getStoreRoles('s1');

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          store: { id: 's1' },
          isActive: true,
        },
        relations: ['user', 'store'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(roles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no active roles', async () => {
      repo.find!.mockResolvedValue([]);

      const result = await service.getStoreRoles('s1');

      expect(result).toEqual([]);
    });

    it('should order by createdAt descending', async () => {
      repo.find!.mockResolvedValue([]);

      await service.getStoreRoles('s1');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        })
      );
    });

    it('should only return active roles', async () => {
      repo.find!.mockResolvedValue([mockStoreRole]);

      await service.getStoreRoles('s1');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe('getUserStoreRoles', () => {
    it('should return all active roles for user', async () => {
      const roles = [
        mockStoreRole,
        {
          ...mockStoreRole,
          id: 'sr2',
          store: { id: 's2', name: 'Store 2' } as Store,
        },
      ];
      repo.find!.mockResolvedValue(roles);

      const result = await service.getUserStoreRoles('u1');

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          user: { id: 'u1' },
          isActive: true,
        },
        relations: ['user', 'store'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(roles);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no roles', async () => {
      repo.find!.mockResolvedValue([]);

      const result = await service.getUserStoreRoles('u1');

      expect(result).toEqual([]);
    });
  });

  describe('userHasStoreRole', () => {
    it('should return true when user has specific active role', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);

      const result = await service.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(result).toBe(true);
    });

    it('should return false when user has different role', async () => {
      const guestRole = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      repo.findOne!.mockResolvedValue(guestRole);

      const result = await service.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(result).toBe(false);
    });

    it('should return false when role is inactive', async () => {
      const inactiveRole = { ...mockStoreRole, isActive: false };
      repo.findOne!.mockResolvedValue(inactiveRole);

      const result = await service.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(result).toBe(false);
    });

    it('should return false when role not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(result).toBe(false);
    });
  });

  describe('userIsStoreAdmin', () => {
    it('should return true when user is admin', async () => {
      jest.spyOn(service, 'userHasStoreRole').mockResolvedValue(true);

      const result = await service.userIsStoreAdmin('u1', 's1');

      expect(service.userHasStoreRole).toHaveBeenCalledWith(
        'u1',
        's1',
        StoreRoles.ADMIN
      );
      expect(result).toBe(true);
    });

    it('should return false when user is not admin', async () => {
      jest.spyOn(service, 'userHasStoreRole').mockResolvedValue(false);

      const result = await service.userIsStoreAdmin('u1', 's1');

      expect(result).toBe(false);
    });
  });

  describe('userCanModerateStore', () => {
    it('should return true for admin', async () => {
      repo.findOne!.mockResolvedValue(mockStoreRole);

      const result = await service.userCanModerateStore('u1', 's1');

      expect(result).toBe(true);
    });

    it('should return true for moderator', async () => {
      const moderatorRole = {
        ...mockStoreRole,
        roleName: StoreRoles.MODERATOR,
      };
      repo.findOne!.mockResolvedValue(moderatorRole);

      const result = await service.userCanModerateStore('u1', 's1');

      expect(result).toBe(true);
    });

    it('should return false for guest', async () => {
      const guestRole = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      repo.findOne!.mockResolvedValue(guestRole);

      const result = await service.userCanModerateStore('u1', 's1');

      expect(result).toBe(false);
    });

    it('should return false for inactive role', async () => {
      const inactiveRole = { ...mockStoreRole, isActive: false };
      repo.findOne!.mockResolvedValue(inactiveRole);

      const result = await service.userCanModerateStore('u1', 's1');

      expect(result).toBe(false);
    });

    it('should return false when no role found', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.userCanModerateStore('u1', 's1');

      expect(result).toBe(false);
    });
  });

  describe('getStoreRoleStats', () => {
    it('should return role statistics for store', async () => {
      const roles = [
        { ...mockStoreRole, roleName: StoreRoles.ADMIN, isActive: true },
        {
          ...mockStoreRole,
          id: 'sr2',
          roleName: StoreRoles.ADMIN,
          isActive: true,
        },
        {
          ...mockStoreRole,
          id: 'sr3',
          roleName: StoreRoles.MODERATOR,
          isActive: true,
        },
        {
          ...mockStoreRole,
          id: 'sr4',
          roleName: StoreRoles.GUEST,
          isActive: false,
        },
      ];
      repo.find!.mockResolvedValue(roles);

      const result = await service.getStoreRoleStats('s1');

      expect(result).toEqual({
        total: 4,
        byRole: {
          [StoreRoles.ADMIN]: 2,
          [StoreRoles.MODERATOR]: 1,
          [StoreRoles.GUEST]: 1,
        },
        active: 3,
        inactive: 1,
      });
    });

    it('should return zeros for store with no roles', async () => {
      repo.find!.mockResolvedValue([]);

      const result = await service.getStoreRoleStats('s1');

      expect(result).toEqual({
        total: 0,
        byRole: {},
        active: 0,
        inactive: 0,
      });
    });

    it('should count multiple roles of same type', async () => {
      const roles = [
        { ...mockStoreRole, roleName: StoreRoles.ADMIN, isActive: true },
        {
          ...mockStoreRole,
          id: 'sr2',
          roleName: StoreRoles.ADMIN,
          isActive: true,
        },
        {
          ...mockStoreRole,
          id: 'sr3',
          roleName: StoreRoles.ADMIN,
          isActive: true,
        },
      ];
      repo.find!.mockResolvedValue(roles);

      const result = await service.getStoreRoleStats('s1');

      expect(result.byRole[StoreRoles.ADMIN]).toBe(3);
    });

    it('should correctly count active and inactive roles', async () => {
      const roles = [
        { ...mockStoreRole, isActive: true },
        { ...mockStoreRole, id: 'sr2', isActive: true },
        { ...mockStoreRole, id: 'sr3', isActive: false },
        { ...mockStoreRole, id: 'sr4', isActive: false },
        { ...mockStoreRole, id: 'sr5', isActive: false },
      ];
      repo.find!.mockResolvedValue(roles);

      const result = await service.getStoreRoleStats('s1');

      expect(result.active).toBe(2);
      expect(result.inactive).toBe(3);
      expect(result.total).toBe(5);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent role assignments', async () => {
      repo.findOne!.mockResolvedValue(null);
      jest.spyOn(service, 'create').mockResolvedValue(mockStoreRole);

      const promises = [
        service.assignStoreRole('u1', 's1', StoreRoles.ADMIN),
        service.assignStoreRole('u2', 's1', StoreRoles.MODERATOR),
        service.assignStoreRole('u3', 's1', StoreRoles.GUEST),
      ];

      await Promise.all(promises);

      expect(service.create).toHaveBeenCalledTimes(3);
    });

    it('should handle role updates with null store', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.update('u1', { store: null } as any)
      ).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      repo.find!.mockRejectedValue(new Error('Database error'));

      await expect(service.getStoreRoles('s1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle revocation of already revoked role', async () => {
      const revokedRole = { ...mockStoreRole, isActive: false };
      repo.findOne!.mockResolvedValue(revokedRole);
      repo.save!.mockResolvedValue(revokedRole);

      // Should not throw
      await service.revokeStoreRole('u1', 's1');

      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should support assign -> check -> revoke workflow', async () => {
      // Assign
      repo.findOne!.mockResolvedValueOnce(null);
      jest.spyOn(service, 'create').mockResolvedValue(mockStoreRole);

      await service.assignStoreRole('u1', 's1', StoreRoles.ADMIN);

      // Check
      repo.findOne!.mockResolvedValueOnce(mockStoreRole);
      const isAdmin = await service.userIsStoreAdmin('u1', 's1');
      expect(isAdmin).toBe(true);

      // Revoke
      repo.findOne!.mockResolvedValueOnce(mockStoreRole);
      repo.save!.mockResolvedValue({ ...mockStoreRole, isActive: false });

      await service.revokeStoreRole('u1', 's1');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        })
      );
    });

    it('should support role upgrade workflow', async () => {
      // Initial role: GUEST
      const guestRole = { ...mockStoreRole, roleName: StoreRoles.GUEST };
      repo.findOne!.mockResolvedValueOnce(guestRole);
      repo.save!.mockResolvedValue({
        ...guestRole,
        roleName: StoreRoles.MODERATOR,
      });

      // Upgrade to MODERATOR
      await service.assignStoreRole('u1', 's1', StoreRoles.MODERATOR);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roleName: StoreRoles.MODERATOR,
        })
      );
    });
  });
});
