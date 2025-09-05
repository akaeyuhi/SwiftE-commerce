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

    // 1) Try to read admin role metadata (method -> class)
    const metaAdminRole = this.reflector.getAllAndOverride<string | undefined>(
      ADMIN_ROLE_META,
      [handler, controller]
    ) as any;

    // 2) Try static accessPolicies fallback
    let staticEntry: PolicyEntry | undefined;
    if ((controller as any).accessPolicies) {
      const handlerName = (handler && handler.name) || undefined;
      const staticMap: AccessPolicies = (controller as any).accessPolicies;
      staticEntry = handlerName ? staticMap?.[handlerName] : undefined;
    }

    // Build a policy entry to evaluate. Priority: method/class metadata -> staticEntry
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

    // If no admin restriction and no auth requirement here -> allow
    if (!policyToCheck) return true;

    // Evaluate via PolicyService
    const allowed = await this.policyService.checkPolicy(
      user,
      policyToCheck,
      params
    );
    if (!allowed)
      throw new ForbiddenException('Requires site admin or authentication');
    return true;
  }
}
