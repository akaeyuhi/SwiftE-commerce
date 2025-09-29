import { Controller } from '@nestjs/common';
import { AdminService } from 'src/modules/auth/admin/admin.service';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { BaseController } from 'src/common/abstracts/base.controller';
import { CreateAdminDto } from 'src/modules/auth/admin/dto/create-admin.dto';
import { UpdateAdminDto } from 'src/modules/auth/admin/dto/update-admin.dto';

@Controller('admin')
export class AdminController extends BaseController<
  Admin,
  CreateAdminDto,
  UpdateAdminDto
> {
  constructor(private readonly adminService: AdminService) {
    super(adminService);
  }
}
