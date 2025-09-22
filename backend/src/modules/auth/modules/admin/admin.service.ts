import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { Admin } from 'src/entities/user/admin.entity';
import { AdminRepository } from 'src/modules/auth/modules/admin/admin.repository';

@Injectable()
export class AdminService extends BaseService<Admin> {
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
