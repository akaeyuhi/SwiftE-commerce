import { forwardRef, Module } from '@nestjs/common';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { UserModule } from 'src/modules/user/user.module';
import { AdminModule } from 'src/modules/auth/admin/admin.module';
import { StoreModule } from 'src/modules/store/store.module';

@Module({
  imports: [
    UserModule,
    forwardRef(() => AdminModule),
    forwardRef(() => StoreModule),
  ],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
