import { Module } from '@nestjs/common';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { AuthAdapterModule } from 'src/modules/auth-adapter/auth-adapter.module';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { EntityOwnerGuard } from 'src/modules/auth/policy/guards/entity-owner.guard';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';

@Module({
  imports: [AuthAdapterModule],
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
