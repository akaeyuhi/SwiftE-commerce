import { Global, Module } from '@nestjs/common';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { GuardServicesModule } from 'src/modules/authorization/guard-services/guard-services.module';

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
