import { Injectable } from '@nestjs/common';
import { GuardAdminRepository } from 'src/modules/authorization/guard-services/repositories/guard-admin.repository';
import { IAdminService } from 'src/common/contracts/policy.contract';

@Injectable()
export class GuardAdminService implements IAdminService {
  constructor(private readonly repo: GuardAdminRepository) {}

  async isUserValidAdmin(userId: string): Promise<boolean> {
    const admin = await this.repo.findOne(userId);
    return !!(admin && admin.isActive);
  }
}
