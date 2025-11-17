/* eslint-disable brace-style */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedDto, PaginatedMetaDto } from '../dtos/paginated.dto';

@Injectable()
export class PaginationInterceptor<T>
  implements NestInterceptor<[T[], number], PaginatedDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<PaginatedDto<T>> {
    const request = context.switchToHttp().getRequest();
    const page = parseInt(request.query.page as string, 10) || 1;
    const limit = parseInt(request.query.limit as string, 10) || 25;

    return next.handle().pipe(
      map(([items, total]) => {
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const meta: PaginatedMetaDto = {
          total,
          page,
          pageSize: limit,
          totalPages,
          hasNextPage,
          hasPrevPage,
        };

        return {
          data: items,
          meta,
        };
      })
    );
  }
}
