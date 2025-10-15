import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { STORE_ROLES_META } from 'src/common/decorators/store-role.decorator';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { PolicyEntry } from 'src/modules/authorization/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * StoreRolesGuard
 *
 * Responsible for enforcing store-level roles (ADMIN, MODERATOR, MEMBER, etc).
 *
 * Policy resolution order:
 *  1. Method decorator metadata (@StoreRoles)
 *  2. Merged accessPolicies (child overrides base)
 *  3. No policy = allow
 *
 * Short-circuit: Site admins bypass all checks.
 */
@Injectable()
export class StoreRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PolicyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const request = context.switchToHttp().getRequest();
    const params = request.params ?? {};
    const user = request.user;

    // --- SHORT-CIRCUIT FOR SITE ADMINS ---
    if (user?.isSiteAdmin === true) {
      return true;
    }

    // Defensive fallback: compute isSiteAdmin if not set
    if (user && (user.isSiteAdmin === undefined || user.isSiteAdmin === null)) {
      try {
        const isAdmin = await this.policyService.isSiteAdmin(user);
        request.user = { ...(request.user ?? {}), isSiteAdmin: isAdmin };
        if (isAdmin) return true;
      } catch {
        request.user = { ...(request.user ?? {}), isSiteAdmin: false };
      }
    }

    // 1) Check method decorator first (highest priority)
    const metaStoreRoles = this.reflector.getAllAndOverride<
      StoreRoles[] | undefined
    >(STORE_ROLES_META, [handler, controller]);

    if (metaStoreRoles && metaStoreRoles.length > 0) {
      // Method has explicit @StoreRoles decorator
      const policy: PolicyEntry = {
        storeRoles: metaStoreRoles,
        requireAuthenticated: true,
      };

      const allowed = await this.policyService.checkPolicy(
        request.user,
        policy,
        params
      );

      if (!allowed) {
        throw new ForbiddenException('Insufficient store role');
      }

      return true;
    }

    // 2) Get merged policy (child overrides base)
    const handlerName = handler.name;
    const mergedPolicy = this.policyService.getMergedPolicy(
      controller,
      handlerName
    );

    if (!mergedPolicy) {
      return true; // No policy = allow
    }

    // 3) Check requireAuthenticated (even if no store roles)
    if (mergedPolicy.requireAuthenticated && !user) {
      throw new ForbiddenException('Authentication required');
    }

    // 4) Check store roles
    if (!mergedPolicy.storeRoles || mergedPolicy.storeRoles.length === 0) {
      return true; // No store roles required
    }

    // 5) Build and evaluate policy
    const policy: PolicyEntry = {
      storeRoles: mergedPolicy.storeRoles,
      requireAuthenticated: mergedPolicy.requireAuthenticated,
    };

    const allowed = await this.policyService.checkPolicy(
      request.user,
      policy,
      params
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Insufficient store role or not authenticated'
      );
    }

    return true;
  }
}
