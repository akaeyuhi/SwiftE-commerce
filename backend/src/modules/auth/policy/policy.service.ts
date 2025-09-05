import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { PolicyEntry } from './policy.types';
import { UserRole } from 'src/entities/user-role.entity';
import { DeepPartial } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { AdminService } from 'src/modules/admin/admin.service';

/**
 * PolicyService centralizes async checks for:
 * - site admin
 * - store role ownership (store admin / store user)
 *
 * It uses the existing UserService to fetch roles/flags when necessary.
 */
@Injectable()
export class PolicyService {
  constructor(
    private readonly userService: UserService,
    private readonly adminService: AdminService
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
   * - Otherwise call userService.getUserRoles(userId) (you should implement this)
   *
   * UserRole shape assumed: { roleName: string, storeId?: string } or similar.
   */
  //TODO Add store-side roel checks when store service implemented
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
    } else if (
      user.id &&
      typeof this.userService.getUserStoreRoles === 'function'
    ) {
      roles = await this.userService.getUserStoreRoles(user.id);
    } else {
      // no role info available
      return false;
    }

    for (const ur of roles) {
      // expected ur to contain roleName and optionally storeId or context
      const hasRoleName = requiredRoles.includes(ur.roleName as StoreRoles);
      const sameStore =
        ur.store === null ||
        String(ur.store.id) === storeId ||
        ur.store.id === storeId;

      if (hasRoleName && sameStore) return true;
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
}
