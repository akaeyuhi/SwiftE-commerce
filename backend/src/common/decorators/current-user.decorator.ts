import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'src/entities/user/user.entity';

/**
 * Extracts the current authenticated user from the request.
 * Usage: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
