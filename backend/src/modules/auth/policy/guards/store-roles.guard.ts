import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { STORE_ROLES_META } from 'src/common/decorators/store-role.decorator';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  PolicyEntry,
  AccessPolicies,
} from 'src/modules/auth/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * StoreRolesGuard
 *
 * Responsible for enforcing store-level roles (STORE_ADMIN, STORE_USER, etc).
 *
 * Optimization: if the authenticated user is a site admin, we short-circuit
 * and allow access immediately. We check `request.user.isSiteAdmin` first
 * (this should be set by AdminGuard). If that flag is missing we fall back to
 * calling PolicyService.isSiteAdmin(user), cache the result on request.user,
 * and short-circuit when true.
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
    // If AdminGuard ran earlier it should have set request.user.isSiteAdmin.
    // If flag present and true -> bypass store role checks.
    if (user?.isSiteAdmin === true) {
      return true;
    }

    // Defensive fallback: if flag is missing, compute it once and cache on req.user.
    if (user && typeof user.isSiteAdmin === 'undefined') {
      try {
        const isAdmin = await this.policyService.isSiteAdmin(user);
        request.user = { ...(request.user ?? {}), isSiteAdmin: isAdmin };
        if (isAdmin) return true;
      } catch {
        // If check fails for any reason, set false to avoid repeated attempts
        request.user = { ...(request.user ?? {}), isSiteAdmin: false };
      }
    }

    // 1) Read store-roles metadata (method -> class)
    let requiredRoles = this.reflector.getAllAndOverride<
      StoreRoles[] | undefined
    >(STORE_ROLES_META, [handler, controller]);

    // 2) Fallback to static accessPolicies map (no method re-definition required)
    let staticEntry: PolicyEntry | undefined;
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (controller as any).accessPolicies
    ) {
      const handlerName = (handler && handler.name) || undefined;
      const staticMap: AccessPolicies = (controller as any).accessPolicies;
      staticEntry = handlerName ? staticMap?.[handlerName] : undefined;
      if (staticEntry?.storeRoles) requiredRoles = staticEntry.storeRoles;
    }

    // If nothing required -> allow (but honor requireAuthenticated if present)
    if (!requiredRoles || requiredRoles.length === 0) {
      if (staticEntry?.requireAuthenticated) {
        const allowed = await this.policyService.checkPolicy(
          request.user,
          { requireAuthenticated: true },
          params
        );
        if (!allowed) throw new ForbiddenException('Authentication required');
      }
      return true;
    }

    // Build policy entry and evaluate using PolicyService.checkPolicy
    const policy: PolicyEntry = {
      storeRoles: requiredRoles,
      // if static entry includes requireAuthenticated, include it
      requireAuthenticated: staticEntry?.requireAuthenticated,
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
