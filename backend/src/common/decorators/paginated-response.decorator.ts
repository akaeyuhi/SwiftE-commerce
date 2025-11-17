import { applyDecorators, Type, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationInterceptor } from '../interceptors/pagination.interceptor';
import { PaginatedDto } from '../dtos/paginated.dto';

export const PaginatedResponse = <TModel extends Type<any>>(model: TModel) =>
  applyDecorators(
    UseInterceptors(new PaginationInterceptor()),
    ApiOkResponse({
      schema: {
        title: `PaginatedResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(PaginatedDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    })
  );
