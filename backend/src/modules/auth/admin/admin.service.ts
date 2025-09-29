import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { AdminRepository } from 'src/modules/auth/admin/admin.repository';
import { CreateAdminDto } from 'src/modules/auth/admin/dto/create-admin.dto';
import { UpdateAdminDto } from 'src/modules/auth/admin/dto/update-admin.dto';

@Injectable()
export class AdminService extends BaseService<
  Admin,
  CreateAdminDto,
  UpdateAdminDto
> {
  constructor(private readonly adminRepo: AdminRepository) {
    super(adminRepo);
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    return await this.repository.findOne({ where: { user: { id: userId } } });
  }

  async isUserValidAdmin(userId: string): Promise<boolean> {
    return !!(await this.findByUserId(userId));
  }
}
