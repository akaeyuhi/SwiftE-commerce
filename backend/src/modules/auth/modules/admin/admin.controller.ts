import { Controller } from '@nestjs/common';
import { AdminService } from 'src/modules/auth/modules/admin/admin.service';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { BaseController } from 'src/common/abstracts/base.controller';

@Controller('admin')
export class AdminController extends BaseController<Admin> {
  constructor(private readonly adminService: AdminService) {
    super(adminService);
  }
}
