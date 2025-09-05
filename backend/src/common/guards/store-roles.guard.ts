// src/auth/guards/store-roles.guard.ts
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

    // If nothing required -> allow
    if (!requiredRoles || requiredRoles.length === 0) {
      // However, if staticEntry asks for requireAuthenticated, honor it
      if (staticEntry?.requireAuthenticated) {
        const allowed = await this.policyService.checkPolicy(
          user,
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

    const allowed = await this.policyService.checkPolicy(user, policy, params);
    if (!allowed)
      throw new ForbiddenException(
        'Insufficient store role or not authenticated'
      );

    return true;
  }
}
