import { ICrudService } from 'src/common/interfaces/crud/crud.interface';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { DeepPartial, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

/**
 * BaseService
 *
 * Generic service layer that implements common CRUD operations by delegating
 * to a `BaseRepository` and optionally converting entities to transfer DTOs
 * via a `BaseMapper`.
 *
 * Subclasses should inject a concrete repository and optionally a mapper.
 * The BaseService implements `ICrudService` and provides safe defaults and
 * common patterns used across domain services.
 *
 * Generics:
 *  - `Entity`      — persistence / domain entity type (extends `ObjectLiteral`).
 *  - `CreateDto`   — DTO accepted by `create` (defaults to `Partial<Entity>`).
 *  - `UpdateDto`   — DTO accepted by `update` (defaults to `Partial<Entity>`).
 *  - `TransferDto` — optional transfer/response shape returned by methods (defaults to `Entity`).
 *
 * Notes:
 *  - The `mapper` is optional. If provided, service methods return DTOs produced by
 *    `mapper.toDto(...)`; otherwise raw entity objects are returned.
 *  - Service methods throw `NotFoundException` for missing entities where appropriate.
 *  - For multi-step or atomic operations, wrap calls in a transaction at the service layer.
 */
export abstract class BaseService<
  Entity extends ObjectLiteral,
  CreateDto = Partial<Entity>,
  UpdateDto = Partial<Entity>,
  TransferDto = Entity,
  // eslint-disable-next-line prettier/prettier
> implements ICrudService<Entity, CreateDto, UpdateDto, TransferDto> {
  /**
   * Construct a BaseService.
   *
   * @param repository - repository implementing data access helpers (findById, createEntity, etc.)
   * @param mapper - optional mapper to convert between Entity and TransferDto shapes
   */
  protected constructor(
    protected readonly repository: BaseRepository<Entity>,
    protected readonly mapper?: BaseMapper<Entity, TransferDto>
  ) {}

  /**
   * Create a new entity from the provided DTO.
   *
   * Behavior:
   *  - Delegates to `repository.createEntity(...)` which creates and saves the entity.
   *  - If a mapper is provided, returns the mapped DTO; otherwise returns the saved entity.
   *
   * Note:
   *  - If you need validation or additional pre-save logic, override this method
   *    in the concrete service or run that logic before calling `super.create`.
   *
   * @param dto - the creation DTO
   * @returns the created TransferDto or Entity
   */
  async create(dto: CreateDto): Promise<TransferDto | Entity> {
    const newEntity = await this.repository.createEntity(
      dto as DeepPartial<Entity>
    );
    return this.mapper?.toDto(newEntity) ?? newEntity;
  }

  /**
   * Retrieve all entities.
   *
   * Behavior:
   *  - Calls `repository.findAll()` and maps the result with `mapper.toDtoList`
   *    when a mapper is present.
   *
   * @returns array of TransferDto or Entity
   */
  async findAll(): Promise<TransferDto[] | Entity[]> {
    const entities = await this.repository.findAll();
    return this.mapper?.toDtoList(entities) ?? entities;
  }

  /**
   * Retrieve a single entity by id.
   *
   * Behavior:
   *  - Calls `repository.findById(id)`.
   *  - If not found, throws `NotFoundException`.
   *  - If a mapper is present, returns the mapped DTO.
   *
   * @param id - identifier of the requested entity
   * @throws NotFoundException when the entity is not found
   * @returns TransferDto or Entity
   */
  async findOne(id: string): Promise<TransferDto | Entity> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException('User not found');
    return this.mapper?.toDto(entity) ?? (entity as any);
  }

  /**
   * Update an existing entity.
   *
   * Behavior:
   *  - Loads the entity using `findById`. If missing, throws `NotFoundException`.
   *  - Uses `Object.assign` to copy DTO fields onto the entity instance.
   *  - Calls `repository.save(entity)` to persist changes (ensures entity lifecycle hooks run).
   *  - Returns the saved entity or mapped DTO.
   *
   * Notes:
   *  - This approach runs entity lifecycle hooks and triggers validations attached
   *    to `save`. If you prefer direct SQL UPDATE, consider using `repository.update`.
   *
   * @param id - entity identifier to update
   * @param dto - partial fields to update
   * @throws NotFoundException when the entity is not found
   * @returns updated TransferDto or Entity
   */
  async update(id: string, dto: UpdateDto): Promise<Entity | TransferDto> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundException('Entity not found');
    Object.assign(entity, dto);
    const updated = await this.repository.save(entity);
    return this.mapper?.toDto(updated) ?? updated;
  }

  /**
   * Remove an entity by id.
   *
   * Behavior:
   *  - Calls `repository.delete(id)` and inspects the result.
   *  - If `affected === 0`, throws `NotFoundException`.
   *
   * Notes:
   *  - If your project uses soft deletes, override this method in a subclass
   *    to call `softDelete` or to mark a `deletedAt` column instead.
   *
   * @param id - identifier of the entity to remove
   * @throws NotFoundException when no row was deleted
   */
  async remove(id: string): Promise<void> {
    const res = await this.repository.delete(id);
    if (res.affected === 0) throw new NotFoundException('Entity not found');
  }

  /**
   * Helper to fetch a raw entity by id without throwing.
   *
   * Useful when callers need to inspect the entity or perform additional checks
   * before acting (for example: ownership checks).
   *
   * @param id - identifier of the entity
   * @returns the entity or null if not found
   */
  async getEntityById(id: string): Promise<Entity | null> {
    return this.repository.findById(id);
  }
}

/*
 * Example usage (in a concrete service):
 *
 * @Injectable()
 * export class UsersService extends BaseService<UserEntity, CreateUserDto, UpdateUserDto, UserDto> {
 *   constructor(
 *     @InjectRepository(UserEntity) private readonly userRepo: UserRepository,
 *     private readonly userMapper: UserMapper
 *   ) {
 *     super(userRepo, userMapper);
 *   }
 *
 *   // override if you need custom create behavior
 *   async create(dto: CreateUserDto) {
 *     // custom pre-processing
 *     const created = await super.create(dto);
 *     // custom post-processing
 *     return created;
 *   }
 * }
 *
 * Note: For multi-step operations (e.g., create + link to other tables), prefer using
 * transactions at the service layer (QueryRunner / manager) to ensure atomicity.
 */
