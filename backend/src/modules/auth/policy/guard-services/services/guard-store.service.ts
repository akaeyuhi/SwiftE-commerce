import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuardStoreRepository } from '../repositories/guard-store.repository';
import { IStoreService } from 'src/common/contracts/policy.contract';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class GuardStoreService implements IStoreService {
  constructor(private readonly repo: GuardStoreRepository) {}

  async hasUserStoreRole(userRole: UserRole) {
    const store = await this.repo.findById(userRole.store.id);
    if (!store) throw new BadRequestException('Store not found');
    return store.userRoles.some(
      (storeRole) =>
        storeRole.user.id === userRole.user.id &&
        storeRole.roleName === userRole.roleName
    );
  }
  async findOne(id: string): Promise<Store> {
    const store = await this.repo.findById(id);
    if (!store) throw new NotFoundException('User not found');
    return store;
  }
}
