import { BaseService } from 'src/common/abstracts/base.service';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginatedResult } from 'src/common/interfaces/crud/paginated-result.interface';
import { ObjectLiteral } from 'typeorm';

/**
 * PaginatedService
 *
 * Extension of BaseService that adds a single responsibility: paginated queries.
 * Concrete services that need paging (list endpoints with page/limit/filter/sort)
 * should extend this class and implement the `paginate` method.
 *
 * Generics:
 *  - `Entity`      — persistence / domain entity type (extends `ObjectLiteral`).
 *  - `CreateDto`   — DTO used for create operations (defaults to `Partial<Entity>`).
 *  - `UpdateDto`   — DTO used for update operations (defaults to `Partial<Entity>`).
 *  - `TransferDto` — DTO/transfer representation returned by read operations (defaults to `Entity`).
 *
 * Responsibilities & expectations for implementers:
 *  - `paginate` should return a `PaginatedResult<TransferDto>` containing:
 *      - `items`   — array of TransferDto for the current page,
 *      - `meta`    — pagination metadata (total, page, limit, pages etc.).
 *  - `pagination` parameter is expected to contain at least `page` and `limit` (see `PaginationDto`).
 *  - `filter` is optional and intended to accept flexible filter criteria (e.g. search text,
 *    exact-match fields, date ranges). Concrete implementations should sanitize and validate
 *    `filter` before using it in queries to avoid injection/logic bugs.
 *  - Implementations should be performant: use indexed fields for WHERE/ORDER BY,
 *    avoid `SELECT *` when possible, and use `COUNT(*)` or a separate indexed counter
 *    to compute `total`.
 *  - Mapping: if the service has a `mapper` (inherited from `BaseService`), convert entities
 *    to `TransferDto` before returning `items`. Keep mapping logic consistent with other service methods.
 *
 * Common implementation pattern (example):
 * 1. Build a query using repository / queryBuilder applying filters, sorting.
 * 2. Apply pagination offsets: `skip = (page-1) * limit`, `take = limit`.
 * 3. Execute two queries (or use DB features that return rows + count):
 *    - `items = await qb.skip(skip).take(take).getMany()`
 *    - `total = await qb.getCount()`
 * 4. Map `items` to DTOs if `mapper` is present.
 * 5. Return `{ items, meta: { total, page, limit, pages: Math.ceil(total/limit) } }`.
 *
 * Notes:
 *  - Consider supporting cursor-based pagination for very large datasets or for consistent
 *    ordering when inserts/updates occur during paging.
 *  - If filters are expensive or rely on relations, consider preloading necessary joins
 *    and applying proper select/where clauses to avoid N+1 queries.
 *  - For APIs that expose sorting, validate allowed sort fields to avoid arbitrary SQL injection.
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
   * Implementers must return a `PaginatedResult<TransferDto>` that contains page items
   * and pagination metadata. The method receives a `PaginationDto` (common fields:
   * `page`, `limit`, optionally `sort` and `order`) and an optional `filter` object to
   * refine results.
   *
   * @param pagination - pagination parameters (page, limit, optional sorting)
   * @param filter - optional ad-hoc filter object (key/value pairs, search text, ranges)
   * @returns Promise resolving to a `PaginatedResult<TransferDto>` with `items` and `meta`
   *
   * @example
   * // typical implementation sketch (not actual code here):
   * // const qb = this.repository.createQueryBuilder('t');
   * // applyFilters(qb, filter);
   * // const total = await qb.getCount();
   * // const items = await qb.skip((page - 1) * limit).take(limit).getMany();
   * // const dtos = this.mapper ? this.mapper.toDtoList(items) : items;
   * // return { items: dtos, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
   */
  abstract paginate(
    pagination: PaginationDto,
    filter?: Record<string, any>
  ): Promise<PaginatedResult<TransferDto>>;
}
