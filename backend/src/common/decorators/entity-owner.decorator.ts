import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by EntityOwnerGuard.
 */
export const ENTITY_OWNER_KEY = 'entityOwner';

/**
 * Options for EntityOwnerGuard decorator.
 *
 * - serviceToken?: any
 *     Injection token (class or provider token) of the service/repository used to load entity.
 *     If provided the guard will attempt to resolve it via ModuleRef and call:
 *       1) service.getEntityById(id) if available (preferred),
 *       2) otherwise service.findById(id),
 *       3) otherwise service.findOne({ where: { id } }) (fallback)
 *
 * - idParam?: string
 *     Name of the route param that contains entity id (defaults to 'id').
 *
 * - allowMissingEntity?: boolean
 *     When true, if the entity cannot be found the guard treats it as unauthorized
 *     rather than throwing NotFoundException.
 *
 * Example:
 *   @UseGuards(JwtAuthGuard, EntityOwnerGuard)
 *   @EntityOwner({ serviceToken: ReviewsService, idParam: 'id' })
 *   @Put(':id')
 */
export interface EntityOwnerOptions {
  serviceToken?: any;
  idParam?: string;
  allowMissingEntity?: boolean;
}

export const EntityOwner = (opts: EntityOwnerOptions) =>
  SetMetadata(ENTITY_OWNER_KEY, opts);
