import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  offset: number;
}

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page as string, 10) || 1;
    const limit = parseInt(request.query.limit as string, 10) || 10;

    const skip = (page - 1) * limit;

    return { page, limit, skip, take: limit, offset: skip };
  }
);
