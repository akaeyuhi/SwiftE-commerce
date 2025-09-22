import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { PolicyService } from 'src/modules/auth/modules/policy/policy.service';
import {
  ENTITY_OWNER_KEY,
  EntityOwnerOptions,
} from 'src/common/decorators/entity-owner.decorator';

/**
 * EntityOwnerGuard
 *
 * Ensures the authenticated user is the owner/author of the entity OR a store/site admin.
 *
 * Behavior:
 *  - If request.user.isSiteAdmin === true => allow immediately
 *  - If request.user.isSiteAdmin is undefined => compute via policyService.isSiteAdmin(user) and cache
 *  - If serviceToken provided in decorator -> load entity by idParam using the service
 *  - Call policyService.isOwnerOrAdmin(user, entity) and allow/deny accordingly
 *
 * Usage:
 *  - On controller method:
 *      @UseGuards(JwtAuthGuard, EntityOwnerGuard)
 *      @EntityOwner({ serviceToken: ReviewsService, idParam: 'id' })
 *      @Put(':id')
 *
 *  - On controller class (applies to all methods unless overridden)
 */
@Injectable()
export class EntityOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly policyService: PolicyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // read metadata from handler or controller class
    const opts =
      this.reflector.get<EntityOwnerOptions>(
        ENTITY_OWNER_KEY,
        context.getHandler()
      ) ??
      this.reflector.get<EntityOwnerOptions>(
        ENTITY_OWNER_KEY,
        context.getClass()
      );

    // if no metadata, guard is not configured -> allow
    if (!opts) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new UnauthorizedException('User not authenticated');

    // 1) short-circuit for site admin (cached on req.user if AdminGuard ran)
    if (user?.isSiteAdmin === true) return true;

    // defensive: compute and cache site-admin flag if missing
    if (typeof user.isSiteAdmin === 'undefined') {
      try {
        const isAdmin = await this.policyService.isSiteAdmin(user);
        request.user = { ...(request.user ?? {}), isSiteAdmin: isAdmin };
        if (isAdmin) return true;
      } catch {
        request.user = { ...(request.user ?? {}), isSiteAdmin: false };
      }
    }

    // 2) if no serviceToken provided, we can still attempt a "probe" entity using route params
    const idParam = opts.idParam ?? 'id';
    const entityId = request.params?.[idParam];

    let entity: any = undefined;

    if (opts.serviceToken) {
      // try to resolve service/repository/provider from container
      const token = opts.serviceToken;
      const provider = this.moduleRef.get(token, { strict: false });
      if (!provider) {
        throw new Error(
          `EntityOwnerGuard: provider for token ${String(token)} not found`
        );
      }

      // Attempt to load entity using common method names
      if (entityId) {
        // Prefer BaseService.getEntityById if present
        if (typeof provider.getEntityById === 'function') {
          entity = await provider.getEntityById(entityId);
        } else if (typeof provider.findById === 'function') {
          entity = await provider.findById(entityId);
        } else if (typeof provider.findOne === 'function') {
          entity = await provider.findOne({
            where: { id: entityId } as any,
          } as any);
        } else {
          // provider doesn't expose expected methods; fallback to undefined
          entity = undefined;
        }
      } else {
        // no id param — can't load entity
        entity = undefined;
      }
      // No serviceToken — try to build a minimal probe entity from params (userId / storeId)
      // If id param present, we can't load entity, so we will fail unless allowMissingEntity true
    } else if (entityId) {
      entity = undefined;
    } else if (request.params?.storeId) {
      entity = { store: { id: request.params.storeId } };
    } else if (request.params?.userId) {
      entity = { user: { id: request.params.userId } };
    }

    // 3) If entity missing and allowMissingEntity is false -> throw NotFound
    if (!entity) {
      if (opts.allowMissingEntity) {
        // treat as unauthorized
        throw new ForbiddenException('Not authorized or entity not found');
      } else {
        throw new NotFoundException(
          `Entity not found (param '${idParam}'=${entityId})`
        );
      }
    }

    // 4) Delegate actual owner-or-admin check to PolicyService
    const allowed = await this.policyService.isOwnerOrAdmin(user, entity);
    if (!allowed)
      throw new ForbiddenException('Not authorized to access this resource');

    // optionally attach loaded entity for later handlers to reuse
    request.entity = entity;

    return true;
  }
}
