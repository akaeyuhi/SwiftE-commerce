import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLE_META } from 'src/common/decorators/admin-role.decorator';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  PolicyEntry,
  AccessPolicies,
} from 'src/modules/auth/policy/policy.types';

/**
 * AdminGuard
 *
 * Responsibilities:
 *  - Determine whether the currently authenticated user is a site admin and
 *    attach a trusted boolean `request.user.isSiteAdmin` for downstream guards.
 *  - Resolve per-route admin metadata or static accessPolicies and evaluate them
 *    using PolicyService.checkPolicy().
 *
 * Why we set `request.user.isSiteAdmin`:
 *  Other guards (StoreRolesGuard, OwnerOrAdminGuard, etc.) should check this
 *  flag first and short-circuit to avoid duplicate/expensive DB calls.
 *
 * Usage:
 *  @UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, OwnerOrAdminGuard)
 *
 * Note: ensure JwtAuthGuard runs before this guard so `request.user` is populated.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PolicyService
  ) {}

  /**
   * Evaluate whether the request may proceed.
   *
   * - Always computes `isSiteAdmin` and attaches it to `request.user`.
   * - If there is no admin-related policy for the handler / controller, the guard
   *   still returns true (allow) because no admin restriction was specified.
   * - If there *is* a policy (from decorator or static accessPolicies) it is
   *   evaluated via PolicyService.checkPolicy and a ForbiddenException is thrown
   *   when the policy is not satisfied.
   *
   * @param context - ExecutionContext from Nest
   * @returns boolean - true when access allowed (or throws ForbiddenException)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const request = context.switchToHttp().getRequest();
    const params = request.params ?? {};
    const user = request.user;

    // 1) Compute site-admin status once and attach to req.user for downstream guards.
    //    Always overwrite with server-computed value (do not trust client).
    try {
      const isSiteAdmin = await this.policyService.isSiteAdmin(user);
      // ensure request.user exists
      request.user = { ...(request.user ?? {}), isSiteAdmin };
    } catch (error) {
      // on failure, explicitly set false so downstream logic is predictable
      console.error(error);
      request.user = { ...(request.user ?? {}), isSiteAdmin: false };
    }

    // 2) Resolve admin metadata (route decorator) and static accessPolicies for the controller
    const metaAdminRole = this.reflector.getAllAndOverride<string | undefined>(
      ADMIN_ROLE_META,
      [handler, controller]
    ) as any;

    let staticEntry: PolicyEntry | undefined;
    if ((controller as any).accessPolicies) {
      const handlerName = (handler && handler.name) || undefined;
      const staticMap: AccessPolicies = (controller as any).accessPolicies;
      staticEntry = handlerName ? staticMap?.[handlerName] : undefined;
    }

    const policyToCheck: PolicyEntry | undefined = metaAdminRole
      ? { adminRole: metaAdminRole as any }
      : staticEntry && staticEntry.adminRole
        ? {
            adminRole: staticEntry.adminRole,
            requireAuthenticated: staticEntry.requireAuthenticated,
          }
        : // If static entry exists but no adminRole,
          // still allow it to enforce requireAuthenticated if present
          staticEntry && staticEntry.requireAuthenticated
          ? { requireAuthenticated: true }
          : undefined;

    // 3) If nothing to check (no admin policy), allow — but downstream guards can
    //    still short-circuit because request.user.isSiteAdmin is set.
    if (!policyToCheck) return true;

    // 4) Evaluate policy using PolicyService.checkPolicy which may perform finer checks.
    const allowed = await this.policyService.checkPolicy(
      request.user,
      policyToCheck,
      params
    );

    if (!allowed) {
      throw new ForbiddenException('Requires site admin or authentication');
    }

    return true;
  }
}
