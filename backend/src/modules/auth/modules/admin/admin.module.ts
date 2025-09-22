import { Module } from '@nestjs/common';
import { AdminService } from 'src/modules/auth/modules/admin/admin.service';
import { AdminController } from 'src/modules/auth/modules/admin/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { AdminRepository } from 'src/modules/auth/modules/admin/admin.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
