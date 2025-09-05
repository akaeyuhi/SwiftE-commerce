import { Body, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { BaseService } from './base.service';
import { ObjectLiteral } from 'typeorm';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

/**
 * Abstract base HTTP controller providing standard CRUD endpoints.
 *
 * This class centralizes common routes so child controllers can:
 * - inherit route implementations (no need to rewrite CRUD methods),
 * - inherit authentication & authorization guards,
 * - override access rules per-controller (see `static accessPolicies`),
 * - or override single routes by redeclaring a method and calling `super`.
 *
 * Generics:
 *  - `Entity`      — TypeORM entity type (or plain object shape).
 *  - `CreateDto`   — DTO type accepted by `create` (defaults to `Partial<Entity>`).
 *  - `UpdateDto`   — DTO type accepted by `update` (defaults to `Partial<Entity>`).
 *  - `TransferDto` — Optional transfer/response shape (defaults to `Entity`).
 *
 * Guards applied (in this order by decorator): `JwtAuthGuard`, `AdminGuard`, `StoreRolesGuard`.
 * The guards themselves resolve policies using:
 *  1) method-level decorator metadata (e.g. `@AdminRole`, `@StoreRole`),
 *  2) class-level decorator metadata,
 *  3) `static accessPolicies` on the controller class,
 *  4) base-method defaults (the decorators on the base methods below).
 *
 * Access override options for child controllers (from most specific to least):
 *  - Add a method-level decorator and redeclare the method (wrap and call `super`).
 *  - Apply a class-level decorator (e.g. `@StoreRole(...)`) to affect all inherited methods.
 *  - Define `static accessPolicies` on the child controller to override specific method policies
 *    without re-declaring route methods.
 *
 * Example `static accessPolicies` shape (see `AccessPolicies` type):
 * ```ts
 * static accessPolicies = {
 *   findAll: { storeRoles: [StoreRoles.ADMIN] },
 *   findOne: { storeRoles: [StoreRoles.ADMIN] },
 *   remove:  { adminRole: AdminRoles.ADMIN }, // only global admins can delete
 * };
 * ```
 */
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export abstract class BaseController<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Entity,
> {
  /**
   * Optional per-controller override map.
   *
   * Child controllers can set this to a record that maps base method names
   * (`findAll`, `findOne`, `create`, `update`, `remove`, etc.) to policy entries.
   *
   * Policy resolution priority (when guards evaluate access):
   * 1) method decorator metadata (e.g. `@AdminRole(...)`, `@StoreRole(...)`)
   * 2) class decorator metadata (e.g. `@StoreRole(...)` placed on controller class)
   * 3) `static accessPolicies` map on the controller class
   * 4) default metadata on the base methods defined below
   *
   * Set to `null` by default to indicate "no static overrides".
   */
  static accessPolicies: AccessPolicies | null = null;

  /**
   * BaseController constructor.
   *
   * @param service - a service implementing the common data operations used by the base methods.
   *                  The `BaseService` should implement `findAll`, `findOne`, `create`, `update`, `remove`.
   */
  protected constructor(
    protected readonly service: BaseService<
      Entity,
      CreateDto,
      UpdateDto,
      TransferDto
    >
  ) {}

  /**
   * GET /
   *
   * Returns an array of all entities (or transfer DTOs).
   *
   * Default access: inherits the global guards. If you want to change access:
   *  - apply a class-level decorator (e.g. `@StoreRole(...)`) on the derived controller, or
   *  - set a `static accessPolicies.findAll` entry on the derived controller.
   *
   * @returns Promise resolving to the list of entities or transfer objects.
   */
  @Get()
  findAll(): Promise<Entity[] | TransferDto[]> {
    return this.service.findAll();
  }

  /**
   * GET /:id
   *
   * Returns a single entity by id.
   *
   * Default access: inherits the global guards and base-level defaults.
   * Common override approaches:
   *  - Class-level `@StoreRole(...)` on derived controller (applies to all routes).
   *  - `static accessPolicies.findOne` to change only this route without redeclaring the method.
   *  - Redeclare this method in the child controller and add a method-level decorator, then call `super.findOne(id)`.
   *
   * @param id - identifier path param for the entity
   * @returns Promise resolving to the found entity or transfer object
   */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Entity | TransferDto> {
    return this.service.findOne(id);
  }

  /**
   * POST /
   *
   * Creates a new entity.
   *
   * Default access: site-wide admins only (decorated with `@AdminRole(AdminRoles.ADMIN)`).
   * To override:
   *  - set `static accessPolicies.create` on the child controller, or
   *  - redeclare and decorate the method in the child controller and call `super.create(dto)`.
   *
   * @param dto - data transfer object used to create the entity
   * @returns Promise resolving to the created entity or transfer object
   */
  @Post()
  @AdminRole(AdminRoles.ADMIN)
  create(@Body() dto: CreateDto): Promise<Entity | TransferDto> {
    return this.service.create(dto);
  }

  /**
   * PUT /:id
   *
   * Updates an existing entity by id.
   *
   * Default access: site-wide admins only (decorated with `@AdminRole(AdminRoles.ADMIN)`).
   * Override options are the same as for `create`.
   *
   * @param id - identifier path param for the entity to update
   * @param dto - DTO with fields to update
   * @returns Promise resolving to the updated entity or transfer object
   */
  @Put(':id')
  @AdminRole(AdminRoles.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDto
  ): Promise<Entity | TransferDto> {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /:id
   *
   * Removes an entity by id.
   *
   * Default access: site-wide admins only (decorated with `@AdminRole(AdminRoles.ADMIN)`).
   * If you want store-admins (or other roles) to be allowed to delete for certain controllers:
   *  - use `static accessPolicies.remove` to provide `{ storeRoles: [StoreRoles.ADMIN] }`, or
   *  - redeclare this method on the child controller and place the appropriate decorator(s) on it.
   *
   * @param id - identifier path param for the entity to remove
   * @returns Promise resolving when deletion finishes (void)
   */
  @Delete(':id')
  @AdminRole(AdminRoles.ADMIN)
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
