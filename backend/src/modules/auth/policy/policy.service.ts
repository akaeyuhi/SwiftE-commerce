import { Inject, Injectable } from '@nestjs/common';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { PolicyEntry } from 'src/modules/auth/policy/policy.types';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { DeepPartial } from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { StoreOwnedEntity } from 'src/common/interfaces/store-owned.entity.interface';
import { UserOwnedEntity } from 'src/common/interfaces/user-owned.entity.interface';
import { Store } from 'src/entities/store/store.entity';
import {
  ADMIN_SERVICE,
  IAdminService,
  IStoreService,
  IUserService,
  STORE_SERVICE,
  USER_SERVICE,
} from 'src/common/contracts/policy.contract';

/**
 * PolicyService centralizes async checks for:
 * - site admin
 * - store role ownership (store admin / store user)
 * - entity ownership (user-owned entities)
 *
 * Use the ownership helpers (isOwner*, isStoreAdminForEntity*, isOwnerOrAdmin*) in controllers
 * when you need to enforce owner-or-admin semantics.
 */
@Injectable()
export class PolicyService {
  constructor(
    @Inject(USER_SERVICE) private readonly userService: IUserService,
    @Inject(ADMIN_SERVICE) private readonly adminService: IAdminService,
    @Inject(STORE_SERVICE) private readonly storeService: IStoreService
  ) {}

  /**
   * Returns true if the user is a site admin.
   * - If user has a top-level role field (e.g. user.role === 'admin') we trust it.
   * - Otherwise fall back to userService.isUserSiteAdmin(userId).
   */
  async isSiteAdmin(user: DeepPartial<User>): Promise<boolean> {
    if (!user) return false;
    if (!user.id) return false;

    try {
      const adminCheck = await this.adminService.isUserValidAdmin(user.id);
      const userCheck = await this.userService.isUserSiteAdmin(user.id);
      return adminCheck === userCheck;
    } catch {
      return false;
    }
  }

  /**
   * Check whether user has any of the store roles for given storeId.
   * - If req.user.roles is already populated with UserRole entities, use that.
   * - Otherwise call userService.getUserStoreRoles(userId)
   *
   * UserRole shape assumed: { roleName: string, storeId?: string } or similar.
   */
  async userHasStoreRoles(
    user: DeepPartial<User>,
    storeId: string | number,
    requiredRoles: StoreRoles[]
  ): Promise<boolean> {
    if (!user) return false;
    const userRoles: UserRole[] | undefined = user.roles as UserRole[];

    let roles: UserRole[] = [];

    if (Array.isArray(userRoles) && userRoles.length > 0) {
      roles = userRoles;
    } else if (user.id) {
      try {
        roles = await this.userService.getUserStoreRoles(user.id);
      } catch {
        return false;
      }
    } else {
      return false;
    }

    for (const ur of roles) {
      const hasRoleName = requiredRoles.includes(ur.roleName as StoreRoles);
      const sameStore =
        ur.store === null ||
        String(ur.store.id) === storeId ||
        ur.store.id === storeId;

      const storeCheck = await this.storeService.hasUserStoreRole(ur);
      if (hasRoleName && sameStore && storeCheck) return true;
    }

    return false;
  }

  /**
   * Evaluate a PolicyEntry for a request.
   * - params: request params (so guards can pass `req.params`)
   * Returns true if policy allows access, false otherwise.
   */
  async checkPolicy(
    user: any,
    policy: PolicyEntry | undefined,
    params?: any
  ): Promise<boolean> {
    // if no policy defined => allow (guard will pick defaults in the BaseController)
    if (!policy) return true;

    if (policy.requireAuthenticated && !user) return false;

    if (policy.adminRole) {
      const isAdmin = await this.isSiteAdmin(user);
      if (!isAdmin) return false;
      // admin satisfied; allow
      return true;
    }

    if (policy.storeRoles && policy.storeRoles.length > 0) {
      // we expect storeId in params (common names: id, storeId)
      const storeId =
        params?.storeId ?? params?.id ?? params?.store_id ?? undefined;
      if (!storeId) return false;
      return await this.userHasStoreRoles(user, storeId, policy.storeRoles);
    }

    // No checks left => allow
    return true;
  }

  /**
   * Try to extract a store id from a StoreOwnedEntity.
   *
   * Accepts:
   *  - entity.store may be a Store object or an id-like value
   *  - entity may itself be a Store (rare)
   *
   * Returns string id or undefined.
   */
  private getStoreIdFromEntity(
    entity?: StoreOwnedEntity | Store | any
  ): string | undefined {
    if (!entity) return undefined;

    if ((entity as StoreOwnedEntity).store) {
      const s = (entity as StoreOwnedEntity).store;
      if (s && typeof s === 'object' && 'id' in s) return s.id;
    }

    if ((entity as Store).id) return (entity as Store).id;

    return undefined;
  }

  /**
   * Returns the owner user id (if any) from a UserOwnedEntity.
   * Checks `user`, `author`, then `owner` properties.
   */
  private getUserIdFromEntity(
    entity?: UserOwnedEntity | any
  ): string | undefined {
    if (!entity) return undefined;
    if (entity.user && (entity.user as any).id) return (entity.user as any).id;
    if (entity.author && (entity.author as any).id)
      return (entity.author as any).id;
    if (entity.owner && (entity.owner as any).id)
      return (entity.owner as any).id;
    return undefined;
  }

  /**
   * Check whether the provided user is the owner/author of a UserOwnedEntity.
   *
   * @param user - partial user object (from req.user or userService)
   * @param entity - entity which may contain `user`, `author` or `owner` relation
   * @returns true when the `user.id` equals entity.{user|author|owner}.id
   */
  async isEntityOwner(
    user: DeepPartial<User>,
    entity?: UserOwnedEntity | null
  ): Promise<boolean> {
    if (!user || !user.id || !entity) return false;
    const ownerId = this.getUserIdFromEntity(entity);
    if (!ownerId) return false;
    return String(user.id) === String(ownerId);
  }

  /**
   * Check whether the provided user is a store admin for the store that owns the entity.
   *
   * This performs these checks (short-circuiting on success):
   * 1. If user is site-admin -> true
   * 2. If entity has a store id, check userHasStoreRoles(user, storeId, [STORE_ADMIN])
   *
   * @param user - authenticated user partial
   * @param entity - entity that implements StoreOwnedEntity or directly a Store
   */
  async isStoreAdminForEntity(
    user: DeepPartial<User>,
    entity?: StoreOwnedEntity | Store | null
  ): Promise<boolean> {
    if (!user || !user.id) return false;

    // site admin has full control
    if (await this.isSiteAdmin(user)) return true;

    const storeId = this.getStoreIdFromEntity(entity);
    if (!storeId) return false;

    return this.userHasStoreRoles(user, storeId, [StoreRoles.ADMIN]);
  }

  /**
   * Returns true when the user is either:
   *  - the owner/author of the UserOwnedEntity, OR
   *  - a site admin, OR
   *  - a store admin for the store that owns the StoreOwnedEntity (if applicable)
   *
   * This is the high-level check controllers can call when enforcing "owner-or-admin" semantics.
   *
   * @param user - authenticated user partial (from req.user)
   * @param entity - an entity that may be UserOwnedEntity, StoreOwnedEntity, or both
   */
  async isOwnerOrAdmin(
    user: DeepPartial<User>,
    entity?: UserOwnedEntity | StoreOwnedEntity | null
  ): Promise<boolean> {
    if (!user || !user.id) return false;

    if (await this.isSiteAdmin(user)) return true;

    if (entity && (await this.isEntityOwner(user, entity as UserOwnedEntity)))
      return true;

    return !!(
      entity &&
      (await this.isStoreAdminForEntity(user, entity as StoreOwnedEntity))
    );
  }
}
