import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Admin } from 'src/entities/admin.entity';
import { BaseController } from 'src/common/abstracts/base.controller';

@Controller()
export class AdminController extends BaseController<Admin> {
  constructor(private readonly adminService: AdminService) {
    super(adminService);
  }
}
