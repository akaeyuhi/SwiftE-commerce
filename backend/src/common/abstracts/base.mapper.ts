export abstract class BaseMapper<Entity, Dto> {
  abstract toDto(entity: Entity): Dto;
  abstract toEntity(dto: Dto): Entity;

  toDtoList(entities: Entity[]): Dto[] {
    return entities.map((e) => this.toDto(e));
  }

  toEntityList(dtos: Dto[]): Entity[] {
    return dtos.map((d) => this.toEntity(d));
  }
}
