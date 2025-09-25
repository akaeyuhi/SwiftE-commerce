import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { createMock, MockedMethods } from '../utils/helpers';
import { IUserService } from 'src/common/contracts/policy.contract';
import { IAdminService } from 'src/common/contracts/policy.contract';
import { IStoreService } from 'src/common/contracts/policy.contract';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';

describe('PolicyService', () => {
  let service: PolicyService;
  let userService: Partial<MockedMethods<IUserService>>;
  let adminService: Partial<MockedMethods<IAdminService>>;
  let storeService: Partial<MockedMethods<IStoreService>>;

  beforeEach(() => {
    userService = createMock<IUserService>([
      'isUserSiteAdmin',
      'getUserStoreRoles',
    ]);
    adminService = createMock<IAdminService>(['isUserValidAdmin']);
    storeService = createMock<IStoreService>(['hasUserStoreRole']);
    service = new PolicyService(
      userService as any,
      adminService as any,
      storeService as any
    );
    jest.clearAllMocks();
  });

  describe('isSiteAdmin', () => {
    it('returns false when user is null or undefined', async () => {
      await expect(service.isSiteAdmin(null as any)).resolves.toBe(false);
      await expect(service.isSiteAdmin(undefined as any)).resolves.toBe(false);
    });

    it('returns false when user.id is missing', async () => {
      await expect(service.isSiteAdmin({} as any)).resolves.toBe(false);
    });

    it('returns true when adminService and userService agree', async () => {
      adminService.isUserValidAdmin!.mockResolvedValue(true);
      userService.isUserSiteAdmin!.mockResolvedValue(true);

      await expect(service.isSiteAdmin({ id: 'u1' })).resolves.toBe(true);
      expect(adminService.isUserValidAdmin).toHaveBeenCalledWith('u1');
      expect(userService.isUserSiteAdmin).toHaveBeenCalledWith('u1');
    });

    it('returns false when adminService and userService disagree', async () => {
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
    it('returns false when user is null or id missing', async () => {
      await expect(
        service.userHasStoreRoles(null as any, 's1', [StoreRoles.ADMIN])
      ).resolves.toBe(false);
      await expect(
        service.userHasStoreRoles({} as any, 's1', [StoreRoles.ADMIN])
      ).resolves.toBe(false);
    });

    it('uses user.roles if provided and returns true on match', async () => {
      const entity = { roleName: StoreRoles.ADMIN, store: { id: 's1' } };
      // storeService returns true
      storeService.hasUserStoreRole!.mockResolvedValue(true);

      const result = await service.userHasStoreRoles(
        { id: 'u1', roles: [entity] } as any,
        's1',
        [StoreRoles.ADMIN]
      );
      expect(result).toBe(true);
      expect(storeService.hasUserStoreRole).toHaveBeenCalledWith(entity);
    });

    it('falls back to userService.getUserStoreRoles and returns false if none match', async () => {
      userService.getUserStoreRoles!.mockResolvedValue([
        { roleName: StoreRoles.GUEST, store: { id: 's1' } },
      ] as any);
      storeService.hasUserStoreRole!.mockResolvedValue(true);

      const result = await service.userHasStoreRoles(
        { id: 'u1' } as any,
        's1',
        [StoreRoles.ADMIN]
      );
      expect(result).toBe(false);
      expect(userService.getUserStoreRoles).toHaveBeenCalledWith('u1');
    });

    it('returns false if userService.getUserStoreRoles throws', async () => {
      userService.getUserStoreRoles!.mockRejectedValue(false);
      await expect(
        service.userHasStoreRoles({ id: 'u1' } as any, 's1', [StoreRoles.ADMIN])
      ).resolves.toBe(false);
    });
  });

  describe('checkPolicy', () => {
    it('allows when policy is undefined', async () => {
      await expect(service.checkPolicy(null, undefined)).resolves.toBe(true);
    });

    it('denies when requireAuthenticated and no user', async () => {
      await expect(
        service.checkPolicy(null, { requireAuthenticated: true } as any)
      ).resolves.toBe(false);
    });

    it('allows adminRole when user is site admin', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(true);
      await expect(
        service.checkPolicy({ id: 'u1' }, { adminRole: true } as any)
      ).resolves.toBe(true);
    });

    it('denies adminRole when user is not site admin', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      await expect(
        service.checkPolicy({ id: 'u1' }, { adminRole: true } as any)
      ).resolves.toBe(false);
    });

    it('denies when storeRoles but no storeId in params', async () => {
      await expect(
        service.checkPolicy(
          { id: 'u1' },
          { storeRoles: [StoreRoles.ADMIN] } as any,
          {}
        )
      ).resolves.toBe(false);
    });

    it('delegates to userHasStoreRoles when storeRoles present', async () => {
      jest.spyOn(service, 'userHasStoreRoles').mockResolvedValue(true);
      const policy = { storeRoles: [StoreRoles.ADMIN] } as any;
      const params = { storeId: 's1' };
      await expect(
        service.checkPolicy({ id: 'u1' }, policy, params)
      ).resolves.toBe(true);
      expect(service.userHasStoreRoles).toHaveBeenCalledWith(
        { id: 'u1' },
        's1',
        [StoreRoles.ADMIN]
      );
    });

    it('allows when no checks left', async () => {
      await expect(service.checkPolicy({ id: 'u1' }, {} as any)).resolves.toBe(
        true
      );
    });
  });

  describe('isEntityOwner', () => {
    it('returns false when user or entity missing', async () => {
      await expect(
        service.isEntityOwner(
          null as any,
          { user: { id: 'u1' } } as UserOwnedEntity
        )
      ).resolves.toBe(false);
      await expect(
        service.isEntityOwner({ id: 'u1' } as any, null)
      ).resolves.toBe(false);
    });

    it('returns true when user.id matches entity.user.id', async () => {
      const owner = { user: { id: 'u1' } };
      await expect(
        service.isEntityOwner({ id: 'u1' } as any, owner as any)
      ).resolves.toBe(true);
    });

    it('returns false when no matching owner property', async () => {
      await expect(
        service.isEntityOwner(
          { id: 'u1' } as any,
          { author: { id: 'u2' } } as any
        )
      ).resolves.toBe(false);
    });
  });

  describe('isStoreAdminForEntity', () => {
    it('returns false when user missing or id missing', async () => {
      await expect(
        service.isStoreAdminForEntity(
          null as any,
          { store: { id: 's1' } } as any
        )
      ).resolves.toBe(false);
      await expect(
        service.isStoreAdminForEntity({} as any, { store: { id: 's1' } } as any)
      ).resolves.toBe(false);
    });

    it('short-circuits when isSiteAdmin true', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(true);
      await expect(
        service.isStoreAdminForEntity(
          { id: 'u1' } as any,
          { store: { id: 's1' } } as any
        )
      ).resolves.toBe(true);
    });

    it('returns false when no storeId on entity', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      await expect(
        service.isStoreAdminForEntity({ id: 'u1' } as any, {} as any)
      ).resolves.toBe(false);
    });

    it('delegates to userHasStoreRoles', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'userHasStoreRoles').mockResolvedValue(true);
      const entity = { store: { id: 's1' } };
      await expect(
        service.isStoreAdminForEntity({ id: 'u1' } as any, entity as any)
      ).resolves.toBe(true);
      expect(service.userHasStoreRoles).toHaveBeenCalledWith(
        { id: 'u1' },
        's1',
        [StoreRoles.ADMIN]
      );
    });
  });

  describe('isOwnerOrAdmin', () => {
    it('returns false when user missing or id missing', async () => {
      await expect(
        service.isOwnerOrAdmin(null as any, { user: { id: 'u1' } } as any)
      ).resolves.toBe(false);
      await expect(
        service.isOwnerOrAdmin({} as any, { user: { id: 'u1' } } as any)
      ).resolves.toBe(false);
    });

    it('short-circuits when isSiteAdmin true', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(true);
      await expect(
        service.isOwnerOrAdmin({ id: 'u1' } as any, {} as any)
      ).resolves.toBe(true);
    });

    it('returns true when entity owner', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'isEntityOwner').mockResolvedValue(true);
      await expect(
        service.isOwnerOrAdmin(
          { id: 'u1' } as any,
          { user: { id: 'u1' } } as any
        )
      ).resolves.toBe(true);
    });

    it('delegates to isStoreAdminForEntity', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'isEntityOwner').mockResolvedValue(false);
      jest.spyOn(service, 'isStoreAdminForEntity').mockResolvedValue(true);
      await expect(
        service.isOwnerOrAdmin(
          { id: 'u1' } as any,
          { store: { id: 's1' } } as any
        )
      ).resolves.toBe(true);
    });

    it('returns false when no checks pass', async () => {
      jest.spyOn(service, 'isSiteAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'isEntityOwner').mockResolvedValue(false);
      jest.spyOn(service, 'isStoreAdminForEntity').mockResolvedValue(false);
      await expect(
        service.isOwnerOrAdmin(
          { id: 'u1' } as any,
          { store: { id: 's1' } } as any
        )
      ).resolves.toBe(false);
    });
  });
});
