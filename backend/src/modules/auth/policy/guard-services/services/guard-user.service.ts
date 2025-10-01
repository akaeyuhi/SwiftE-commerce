import { Injectable, NotFoundException } from '@nestjs/common';
import { GuardUserRepository } from '../repositories/guard-user.repository';
import { IUserService } from 'src/common/contracts/policy.contract';
import { User } from 'src/entities/user/user.entity';
import { AdminRoles } from 'src/common/enums/admin.enum';

@Injectable()
export class GuardUserService implements IUserService {
  constructor(private readonly repo: GuardUserRepository) {}

  async isActive(userId: string): Promise<boolean> {
    const user = await this.repo.findOneWithRelations(userId);
    return user?.isActive ?? false;
  }

  async isUserSiteAdmin(userId: string) {
    const user = await this.findOneWithRelations(userId);
    return user.siteRole === AdminRoles.ADMIN;
  }

  async getUserStoreRoles(userId: string) {
    const user = await this.findOneWithRelations(userId);
    return user.roles;
  }

  private async findOneWithRelations(id: string): Promise<User> {
    const user = await this.repo.findOneWithRelations(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
