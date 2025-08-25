import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleRepository } from 'src/modules/user-role/user-role.repository';
import { User } from 'src/entities/user.entity';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { Store } from 'src/entities/store.entity';
import { UserRole } from 'src/entities/user-role.entity';

@Injectable()
export class UserRoleService {
  constructor(private readonly userRoleRepo: UserRoleRepository) {}
  findAll(): Promise<any[]> {
    return this.userRoleRepo.findAll();
  }
  findOne(id: string): Promise<any> {
    return this.userRoleRepo.findById(id);
  }

  async findByStoreUser(
    userId: string,
    storeId: string
  ): Promise<UserRole | null> {
    return this.userRoleRepo.findOne({
      where: {
        user: {
          id: userId,
        },
        store: {
          id: storeId,
        },
      },
    });
  }

  async create(
    roleName: StoreRoles,
    user: User,
    store: Store
  ): Promise<UserRole> {
    return this.userRoleRepo.create({
      user,
      roleName,
      store,
    });
  }

  async update(user: User, store: Store, newRole: StoreRoles): Promise<any> {
    const role = await this.findByStoreUser(user.id, store.id);
    if (!role) throw new NotFoundException(`Such role doesnt exist`);
    return this.userRoleRepo.save({ ...role, roleName: newRole });
  }
  remove(id: string): Promise<void> {
    return this.remove(id);
  }
}
