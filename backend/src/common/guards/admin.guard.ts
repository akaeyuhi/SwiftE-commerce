import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/modules/users/users.service';
import { AdminRoles } from 'src/common/enums/admin.enum';

@Injectable()
export class SiteAdminGuard implements CanActivate {
  constructor(
    private readonly userService: UsersService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSiteAdmin = this.reflector.get<AdminRoles>(
      'adminRole',
      context.getHandler()
    );
    if (!isSiteAdmin) {
      return true; // Allow access if the route is not restricted to site admins
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    return !!userId;
    //TODO return await this.userService.isUserSiteAdmin(userId);
  }
}
