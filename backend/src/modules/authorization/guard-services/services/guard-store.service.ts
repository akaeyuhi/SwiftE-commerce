import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuardStoreRepository } from 'src/modules/authorization/guard-services/repositories/guard-store.repository';
import { IStoreService } from 'src/common/contracts/policy.contract';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { Store } from 'src/entities/store/store.entity';

@Injectable()
export class GuardStoreService implements IStoreService {
  constructor(private readonly repo: GuardStoreRepository) {}

  async hasUserStoreRole(storeRole: StoreRole) {
    const store = await this.repo.findById(storeRole.storeId);
    if (!store) throw new BadRequestException('Store not found');
    return store.storeRoles.some(
      (role) =>
        role.userId === storeRole.userId && role.roleName === storeRole.roleName
    );
  }
  async findOne(id: string): Promise<Store> {
    const store = await this.repo.findById(id);
    if (!store) throw new NotFoundException('User not found');
    return store;
  }
}
