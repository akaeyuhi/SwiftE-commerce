import { forwardRef, Module } from '@nestjs/common';
import { AdminService } from 'src/modules/auth/modules/admin/admin.service';
import { AdminController } from 'src/modules/auth/modules/admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { AdminRepository } from 'src/modules/auth/modules/admin/admin.repository';
import { PolicyModule } from 'src/modules/auth/modules/policy/policy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Admin]), forwardRef(() => PolicyModule)],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
