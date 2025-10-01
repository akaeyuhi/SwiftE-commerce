import { Global, Module } from '@nestjs/common';
import { GuardServicesModule } from './guard-services/guard-services.module';
import { PolicyService } from './policy/policy.service';

import { AdminGuard } from './guards/admin.guard';
import { StoreRolesGuard } from './guards/store-roles.guard';
import { EntityOwnerGuard } from './guards/entity-owner.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * AuthorizationModule (Global)
 *
 * Centralized authorization module providing:
 * - PolicyService for permission checks
 * - Guards for route protection
 * - Guard services for data access
 *
 * This module is separate from AuthModule (authentication)
 * and is available globally throughout the application.
 */
@Global()
@Module({
  imports: [GuardServicesModule],
  providers: [
    PolicyService,
    AdminGuard,
    StoreRolesGuard,
    EntityOwnerGuard,
    JwtAuthGuard,
  ],
  exports: [
    PolicyService,
    AdminGuard,
    StoreRolesGuard,
    EntityOwnerGuard,
    JwtAuthGuard,
    GuardServicesModule,
  ],
})
export class AuthorizationModule {}
