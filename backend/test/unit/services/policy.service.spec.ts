import { Test, TestingModule } from '@nestjs/testing';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  IUserService,
  IAdminService,
  IStoreService,
  USER_SERVICE,
  ADMIN_SERVICE,
  STORE_SERVICE,
} from 'src/common/contracts/policy.contract';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { createServiceMock, MockedMethods } from '../utils/helpers';
import { UserService } from 'src/modules/user/user.service';
import { AdminService } from 'src/modules/admin/admin.service';
import { StoreService } from 'src/modules/store/store.service';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { User } from 'src/entities/user/user.entity';
import { PolicyEntry } from 'src/modules/authorization/policy/policy.types';
import { UserOwnedEntity } from 'src/common/interfaces/crud/user-owned.entity.interface';
import { StoreOwnedEntity } from 'src/common/interfaces/crud/store-owned.entity.interface';

describe('PolicyService', () => {
  let service: PolicyService;
  let userService: Partial<MockedMethods<IUserService>>;
  let adminService: Partial<MockedMethods<IAdminService>>;
  let storeService: Partial<MockedMethods<IStoreService>>;

  beforeEach(async () => {
    userService = createServiceMock<UserService>([
      'isUserSiteAdmin',
      'getUserStoreRoles',
    ]);
    adminService = createServiceMock<AdminService>(['isUserValidAdmin']);
    storeService = createServiceMock<StoreService>(['hasUserStoreRole']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        { provide: USER_SERVICE, useValue: userService },
        { provide: ADMIN_SERVICE, useValue: adminService },
        { provide: STORE_SERVICE, useValue: storeService },
      ],
    }).compile();

    service = module.get<PolicyService>(PolicyService);
    jest.clearAllMocks();
  });

  describe('isSiteAdmin', () => {
    it('returns false for null/undefined user', async () => {
      await expect(service.isSiteAdmin(null as any)).resolves.toBe(false);
      await expect(service.isSiteAdmin(undefined as any)).resolves.toBe(false);
    });

    it('returns false when user.id missing', async () => {
      await expect(service.isSiteAdmin({} as any)).resolves.toBe(false);
    });

    it('returns true when adminService and userService agree', async () => {
      adminService.isUserValidAdmin!.mockResolvedValue(true);
      userService.isUserSiteAdmin!.mockResolvedValue(true);

      await expect(service.isSiteAdmin({ id: 'u1' })).resolves.toBe(true);
      expect(adminService.isUserValidAdmin).toHaveBeenCalledWith('u1');
      expect(userService.isUserSiteAdmin).toHaveBeenCalledWith('u1');
    });

    it('returns false when they disagree', async () => {
      adminService.isUserValidAdmin!.mockResolvedValue(true);
      userService.isUserSiteAdmin!.mockResolvedValue(false);
      await expect(service.isSiteAdmin({ id: 'u1' })).resolves.toBe(false);
    });

    it('returns false on exception', async () => {
      adminService.isUserValidAdmin!.mockRejectedValue(new Error());
      await expect(service.isSiteAdmin({ id: 'u1' })).resolves.toBe(false);
    });
  });

  describe('userHasStoreRoles', () => {
    it('returns false for null user or no id', async () => {
      await expect(
        service.userHasStoreRoles(null as any, 's1', [StoreRoles.ADMIN])
      ).resolves.toBe(false);
      await expect(
        service.userHasStoreRoles({} as any, 's1', [StoreRoles.ADMIN])
      ).resolves.toBe(false);
    });

    it('uses user.roles array and returns true on match', async () => {
      const role = {
        roleName: StoreRoles.ADMIN,
        store: { id: 's1' },
      } as UserRole;
      storeService.hasUserStoreRole!.mockResolvedValue(true);

      const res = await service.userHasStoreRoles(
        { id: 'u1', roles: [role] } as unknown as UserRole,
        's1',
        [StoreRoles.ADMIN]
      );
      expect(res).toBe(true);
      expect(storeService.hasUserStoreRole).toHaveBeenCalledWith(role);
    });

    it('falls back to getUserStoreRoles and returns false if none match', async () => {
      userService.getUserStoreRoles!.mockResolvedValue([
        { roleName: StoreRoles.GUEST, store: { id: 's1' } },
      ] as UserRole[]);
      storeService.hasUserStoreRole!.mockResolvedValue(true);

      const res = await service.userHasStoreRoles({ id: 'u1' } as User, 's1', [
        StoreRoles.ADMIN,
      ]);
      expect(res).toBe(false);
      expect(userService.getUserStoreRoles).toHaveBeenCalledWith('u1');
    });

    it('returns false when getUserStoreRoles throws', async () => {
      userService.getUserStoreRoles!.mockRejectedValue(new Error());
      await expect(
        service.userHasStoreRoles({ id: 'u1' } as User, 's1', [
          StoreRoles.ADMIN,
        ])
      ).resolves.toBe(false);
    });
  });

  describe('checkPolicy', () => {
    it('allows when no policy', async () => {
      await expect(service.checkPolicy(null, undefined)).resolves.toBe(true);
    });

    it('denies if requireAuthenticated and no user', async () => {
      await expect(
        service.checkPolicy(null, { requireAuthenticated: true } as PolicyEntry)
      ).resolves.toBe(false);
    });

    it('adminRole: allows when site admin', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(true);
      await expect(
        service.checkPolicy({ id: 'u1' }, {
          adminRole: true,
        } as unknown as PolicyEntry)
      ).resolves.toBe(true);
    });

    it('adminRole: denies when not site admin', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      await expect(
        service.checkPolicy({ id: 'u1' }, {
          adminRole: true,
        } as unknown as PolicyEntry)
      ).resolves.toBe(false);
    });

    it('denies when storeRoles but no storeId param', async () => {
      await expect(
        service.checkPolicy(
          { id: 'u1' },
          { storeRoles: [StoreRoles.ADMIN] } as PolicyEntry,
          {}
        )
      ).resolves.toBe(false);
    });

    it('delegates to userHasStoreRoles when storeRoles present', async () => {
      jest.spyOn(service, 'userHasStoreRoles').mockResolvedValue(true);
      const policy = { storeRoles: [StoreRoles.ADMIN] } as PolicyEntry;
      await expect(
        service.checkPolicy({ id: 'u1' }, policy, { storeId: 's1' })
      ).resolves.toBe(true);
      expect(service.userHasStoreRoles).toHaveBeenCalledWith(
        { id: 'u1' },
        's1',
        [StoreRoles.ADMIN]
      );
    });

    it('allows when no checks left', async () => {
      await expect(
        service.checkPolicy({ id: 'u1' }, {} as PolicyEntry)
      ).resolves.toBe(true);
    });
  });

  describe('isEntityOwner', () => {
    it('returns false for missing user/entity', async () => {
      await expect(
        service.isEntityOwner(
          null as any,
          { user: { id: 'u1' } } as unknown as User
        )
      ).resolves.toBe(false);
      await expect(
        service.isEntityOwner({ id: 'u1' } as User, null as any)
      ).resolves.toBe(false);
    });

    it('returns true when user.id matches entity.user.id', async () => {
      await expect(
        service.isEntityOwner(
          { id: 'u1' } as User,
          { user: { id: 'u1' } } as UserOwnedEntity
        )
      ).resolves.toBe(true);
    });

    it('returns false when no match', async () => {
      await expect(
        service.isEntityOwner(
          { id: 'u1' } as User,
          { author: { id: 'u2' } } as UserOwnedEntity
        )
      ).resolves.toBe(false);
    });
  });

  describe('isStoreAdminForEntity', () => {
    it('returns false for missing user/id', async () => {
      await expect(
        service.isStoreAdminForEntity(
          null as any,
          { store: { id: 's1' } } as StoreOwnedEntity
        )
      ).resolves.toBe(false);
      await expect(
        service.isStoreAdminForEntity(
          {} as any,
          { store: { id: 's1' } } as StoreOwnedEntity
        )
      ).resolves.toBe(false);
    });

    it('short-circuits when site admin', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(true);
      await expect(
        service.isStoreAdminForEntity(
          { id: 'u1' } as User,
          { store: { id: 's1' } } as StoreOwnedEntity
        )
      ).resolves.toBe(true);
    });

    it('returns false when no storeId on entity', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      await expect(
        service.isStoreAdminForEntity(
          { id: 'u1' } as UserOwnedEntity,
          {} as StoreOwnedEntity
        )
      ).resolves.toBe(false);
    });

    it('delegates to userHasStoreRoles', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'userHasStoreRoles').mockResolvedValue(true);
      await expect(
        service.isStoreAdminForEntity(
          { id: 'u1' } as User,
          { store: { id: 's1' } } as StoreOwnedEntity
        )
      ).resolves.toBe(true);
      expect(service.userHasStoreRoles).toHaveBeenCalledWith(
        { id: 'u1' },
        's1',
        [StoreRoles.ADMIN]
      );
    });
  });

  describe('isOwnerOrAdmin', () => {
    it('returns false for missing user/id', async () => {
      await expect(
        service.isOwnerOrAdmin(
          null as any,
          { user: { id: 'u1' } } as UserOwnedEntity
        )
      ).resolves.toBe(false);
      await expect(
        service.isOwnerOrAdmin(
          {} as any,
          { user: { id: 'u1' } } as UserOwnedEntity
        )
      ).resolves.toBe(false);
    });

    it('short-circuits when site admin', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(true);
      await expect(
        service.isOwnerOrAdmin({ id: 'u1' } as User, {} as any)
      ).resolves.toBe(true);
    });

    it('returns true when entity owner', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'isEntityOwner').mockResolvedValue(true);
      await expect(
        service.isOwnerOrAdmin(
          { id: 'u1' } as User,
          { user: { id: 'u1' } } as UserOwnedEntity
        )
      ).resolves.toBe(true);
    });

    it('delegates to isStoreAdminForEntity', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'isEntityOwner').mockResolvedValue(false);
      jest.spyOn(service, 'isStoreAdminForEntity').mockResolvedValue(true);
      await expect(
        service.isOwnerOrAdmin(
          { id: 'u1' } as User,
          { store: { id: 's1' } } as StoreOwnedEntity
        )
      ).resolves.toBe(true);
    });

    it('returns false when no checks pass', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'isEntityOwner').mockResolvedValue(false);
      jest.spyOn(service, 'isStoreAdminForEntity').mockResolvedValue(false);
      await expect(
        service.isOwnerOrAdmin(
          { id: 'u1' } as User,
          { store: { id: 's1' } } as StoreOwnedEntity
        )
      ).resolves.toBe(false);
    });
  });
});
