import { Global, Module } from '@nestjs/common';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { EntityOwnerGuard } from 'src/modules/auth/policy/guards/entity-owner.guard';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { GuardServicesModule } from 'src/modules/auth/policy/guard-services/guard-services.module';

@Global()
@Module({
  imports: [GuardServicesModule],
  providers: [
    PolicyService,
    AdminGuard,
    EntityOwnerGuard,
    JwtAuthGuard,
    StoreRolesGuard,
  ],
  exports: [
    PolicyService,
    AdminGuard,
    EntityOwnerGuard,
    JwtAuthGuard,
    StoreRolesGuard,
  ],
})
export class PolicyModule {}
