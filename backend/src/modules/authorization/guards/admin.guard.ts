import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLE_META } from 'src/common/decorators/admin-role.decorator';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { PolicyEntry } from 'src/modules/authorization/policy/policy.types';

/**
 * AdminGuard
 *
 * Responsibilities:
 *  - Determine whether the currently authenticated user is a site admin and
 *    attach a trusted boolean `request.user.isSiteAdmin` for downstream guards.
 *  - Resolve per-route admin metadata or accessPolicies and evaluate them.
 *
 * Policy resolution order:
 *  1. Method decorator metadata (@AdminRole)
 *  2. Merged accessPolicies (child overrides base)
 *  3. No policy = allow
 */
@Injectable()
export class AdminGuard implements CanActivate {
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

    // 1) Compute site-admin status once and attach to req.user
    try {
      const isSiteAdmin = await this.policyService.isSiteAdmin(user);
      request.user = { ...(request.user ?? {}), isSiteAdmin };

      // Short-circuit if site admin
      if (isSiteAdmin) {
        return true;
      }
    } catch (error) {
      console.error('Error checking site admin:', error);
      request.user = { ...(request.user ?? {}), isSiteAdmin: false };
    }

    // 2) Check method decorator first (highest priority)
    const metaAdminRole = this.reflector.getAllAndOverride<string | undefined>(
      ADMIN_ROLE_META,
      [handler, controller]
    );

    if (metaAdminRole) {
      // Method has explicit @AdminRole decorator
      const policy: PolicyEntry = {
        adminRole: metaAdminRole as any,
        requireAuthenticated: true,
      };

      const allowed = await this.policyService.checkPolicy(
        request.user,
        policy,
        params
      );

      if (!allowed) {
        throw new ForbiddenException('Requires site admin access');
      }

      return true;
    }

    // 3) Get merged policy (child overrides base)
    const handlerName = handler.name;
    const mergedPolicy = this.policyService.getMergedPolicy(
      controller,
      handlerName
    );

    if (!mergedPolicy) {
      return true; // No policy = allow
    }

    // 4) Check if adminRole is explicitly set to undefined (means: don't require admin)
    if (
      mergedPolicy.adminRole === undefined &&
      mergedPolicy.requireAuthenticated === undefined
    ) {
      return true;
    }

    // 5) Build policy to check
    const policyToCheck: PolicyEntry = {
      adminRole: mergedPolicy.adminRole,
      requireAuthenticated: mergedPolicy.requireAuthenticated,
    };

    // 6) Evaluate policy
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
