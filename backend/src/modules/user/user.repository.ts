import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { Store } from 'src/entities/store/store.entity';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async getUserWithPassword(email: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Load user with relations required for auth & authorization checks.
   * Adjust the relations array to include any additional relation names.
   */
  async findOneWithRelations(id: string): Promise<User | null> {
    if (!id) return null;
    return this.findOne({
      where: { id },
      relations: ['roles', 'carts', 'orders', 'aiLogs', 'ownedStores'],
    });
  }

  async findOneWithRoles(id: string): Promise<User | null> {
    return this.findOne({ where: { id }, relations: ['roles'] });
  }

  /** @deprecated
   * @param user
   * @param permissions
   */
  assignPermissions(user: User, ...permissions: string[]): Promise<User> {
    return this.save({ ...user, ...permissions });
  }

  async addRoleToUser(user: User, role: StoreRole) {
    return this.save({ ...user, roles: [...user.roles, role] });
  }

  async addStoresToUser(user: User, ...stores: Array<Store | StoreDto>) {
    user.ownedStores.push(...(stores as Store[]));
    return this.save(user);
  }

  async removeRoleFromUser(
    userId: string,
    roleName: StoreRoles,
    storeId?: string
  ) {
    const qb = this.manager
      .createQueryBuilder()
      .delete()
      .from('StoreRole')
      .where('userId = :userId', { userId })
      .andWhere('roleName = :roleName', { roleName });

    if (storeId) {
      qb.andWhere('storeId = :storeId', { storeId });
    }

    return qb.execute();
  }
}
