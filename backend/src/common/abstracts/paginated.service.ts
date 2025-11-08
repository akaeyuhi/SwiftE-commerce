import { BaseService } from 'src/common/abstracts/base.service';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ObjectLiteral } from 'typeorm';

/**
 * PaginatedService
 *
 * Extension of BaseService that adds a single responsibility: paginated queries.
 * Concrete services that need paging (list endpoints with page/limit/filter/sort)
 * should extend this class and implement the `paginate` method.
 *
 * This service is designed to be used with the `PaginationInterceptor`, which
 * expects a `[data, total]` tuple and formats the final paginated response.
 *
 * Generics:
 *  - `Entity`      — persistence / domain entity type (extends `ObjectLiteral`).
 *  - `CreateDto`   — DTO used for create operations (defaults to `Partial<Entity>`).
 *  - `UpdateDto`   — DTO used for update operations (defaults to `Partial<Entity>`).
 *  - `TransferDto` — DTO/transfer representation returned by read operations (defaults to `Entity`).
 *
 * Responsibilities & expectations for implementers:
 *  - `paginate` should return a `[TransferDto[], number]` tuple, where the first
 *    element is the array of items for the current page, and the second is the
 *    total number of items.
 *  - `pagination` parameter is expected to contain at least `page` and `limit` (see `PaginationDto`).
 *  - `filter` is optional and intended to accept flexible filter criteria (e.g. search text,
 *    exact-match fields, date ranges). Concrete implementations should sanitize and validate
 *    `filter` before using it in queries to avoid injection/logic bugs.
 *  - Implementations should be performant: use `findAndCount` or equivalent DB features
 *    that return rows and total count in one operation.
 *  - Mapping: if the service has a `mapper` (inherited from `BaseService`), convert entities
 *    to `TransferDto` before returning the tuple.
 *
 * Common implementation pattern (example):
 * ```ts
 * async paginate(pagination: PaginationDto, filter?: any): Promise<[ProductDto[], number]> {
 *   const { skip, take, ...where } = this.buildWhere(filter);
 *   const [entities, total] = await this.repository.findAndCount({
 *     where,
 *     skip,
 *     take,
 *   });
 *   const dtos = this.mapper.toDtoList(entities);
 *   return [dtos, total];
 * }
 * ```
 */
export abstract class PaginatedService<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Entity,
> extends BaseService<Entity, CreateDto, UpdateDto, TransferDto> {
  /**
   * Execute a paginated query over the entity set.
   *
   * Implementers must return a tuple `[TransferDto[], number]` containing page items
   * and the total count of items. The method receives a `PaginationDto` (common fields:
   * `page`, `limit`, `skip`, `take`) and an optional `filter` object to
   * refine results.
   *
   * @param pagination - pagination parameters (page, limit, skip, take)
   * @param filter - optional ad-hoc filter object (key/value pairs, search text, ranges)
   * @returns Promise resolving to a `[TransferDto[], number]` tuple.
   */
  abstract paginate(
    pagination: PaginationDto,
    filter?: Record<string, any>,
  ): Promise<[TransferDto[], number]>;
}
