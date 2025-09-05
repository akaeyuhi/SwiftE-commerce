/**
 * BaseMapper
 *
 * Small, opinionated abstraction for converting between persistence-layer
 * entities and Transfer/Data-Transfer-Objects (DTOs).
 *
 * Subclasses must implement `toDto` and `toEntity`. `toDtoList` and
 * `toEntityList` are convenience helpers that map arrays using the
 * implementations of those abstract methods.
 *
 * Generics:
 *  - @template Entity — the persistence / domain entity type (e.g. UserEntity).
 *  - @template Dto    — the DTO / transfer representation (e.g. UserDto).
 *
 * Guiding principles:
 *  - Implement `toDto`/`toEntity` as pure functions (no side-effects).
 *  - Prefer returning new objects (avoid mutating the incoming entity/dto).
 *  - Handle `null`/`undefined` consistently in your concrete mapper (decide
 *    whether to throw, return null, or skip items in lists).
 */
export abstract class BaseMapper<Entity, Dto> {
  /**
   * Convert a single entity to its DTO representation.
   *
   * Must be implemented by subclasses.
   *
   * @abstract
   * @param {Entity} entity - source entity to convert
   * @returns {Dto} - DTO representation of the entity
   */
  abstract toDto(entity: Entity): Dto;

  /**
   * Convert a single DTO into an entity.
   *
   * Must be implemented by subclasses.
   *
   * @abstract
   * @param {Dto} dto - source DTO to convert
   * @returns {Entity} - entity representation of the DTO
   */
  abstract toEntity(dto: Dto): Entity;

  /**
   * Convert a list of entities to a list of DTOs.
   *
   * This helper calls `this.toDto` for each element. It does not filter or
   * transform `null`/`undefined` elements — concrete mappers may choose to
   * handle such cases by overriding this method.
   *
   * @param {Entity[]} entities - array of entities to convert
   * @returns {Dto[]} - array of converted DTOs
   */
  toDtoList(entities: Entity[]): Dto[] {
    return entities.map((e) => this.toDto(e));
  }

  /**
   * Convert a list of DTOs to a list of entities.
   *
   * This helper calls `this.toEntity` for each element. It does not filter or
   * transform `null`/`undefined` elements — override if you need different behavior.
   *
   * @param {Dto[]} dtos - array of DTOs to convert
   * @returns {Entity[]} - array of converted entities
   */
  toEntityList(dtos: Dto[]): Entity[] {
    return dtos.map((d) => this.toEntity(d));
  }
}

/**
 * Example usage:
 *
 * interface UserEntity { id: string; firstName: string; lastName: string; }
 * interface UserDto { id: string; fullName: string; }
 *
 * class UserMapper extends BaseMapper<UserEntity, UserDto> {
 *   toDto(entity: UserEntity): UserDto {
 *     return { id: entity.id, fullName: `${entity.firstName} ${entity.lastName}` };
 *   }
 *   toEntity(dto: UserDto): UserEntity {
 *     const [firstName, lastName] = dto.fullName.split(' ');
 *     return { id: dto.id, firstName, lastName };
 *   }
 * }
 *
 * // Using the mapper:
 * const mapper = new UserMapper();
 * const dto = mapper.toDto(userEntity);
 * const entities = mapper.toEntityList([dto1, dto2]);
 */
