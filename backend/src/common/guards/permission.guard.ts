// src/shared/guards/permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../interfaces/permission.interface';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { ResourcesEnum } from 'src/common/enums/resources.enum';
import { CrudActionEnum } from 'src/common/enums/crud-action.enum';
import { User } from 'src/entities/user.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) throw new ForbiddenException('Unauthorized');

    if (user.siteRole === AdminRoles.ADMIN) return true;

    if (user.roles?.some((r) => r.role.name === StoreRoles.ADMIN)) return true;

    const userPermissions: string[] = user.permissionScopes || [];

    const hasPermission = requiredPermissions.every(({ resource, action }) => {
      const resourceKey = resource as ResourcesEnum;
      const actionKey = action as CrudActionEnum;
      const permissionKey = `${resourceKey}:${actionKey}`;
      return userPermissions.includes(permissionKey);
    });

    if (!hasPermission)
      throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
