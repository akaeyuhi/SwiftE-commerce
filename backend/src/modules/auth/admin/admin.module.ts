import { forwardRef, Module } from '@nestjs/common';
import { AdminService } from 'src/modules/auth/admin/admin.service';
import { AdminController } from 'src/modules/auth/admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { AdminRepository } from 'src/modules/auth/admin/admin.repository';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Admin]), forwardRef(() => PolicyModule)],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
