import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from 'src/entities/user/user.entity';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { UserRole } from 'src/entities/user/policy/user-role.entity';

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
      .select('user.id', 'id')
      .addSelect('user.id')
      .addSelect('user.password')
      .addSelect('user.username')
      .addSelect('user.email')
      .addSelect('user.role')
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
      relations: [
        'roles', // user_roles join rows
        'roles.roleName', // actual Role entity
        'roles.store', // store scope for the user role (if any)
        'carts',
        'orders',
        'aiLogs',
        // add more relations as needed, e.g. 'reviews', 'newsPosts'
      ],
    });
  }

  /** @deprecated
   * @param user
   * @param permissions
   */
  assignPermissions(user: User, ...permissions: string[]): Promise<User> {
    return this.save({ ...user, ...permissions });
  }

  async addRoleToUser(user: User, role: UserRole) {
    return this.save({ ...user, roles: [...user.roles, role] });
  }

  async removeRoleFromUser(userId: string, roleId: string, storeId?: string) {
    const qb = this.manager
      .getRepository('UserRole')
      .createQueryBuilder('ur')
      .delete()
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.roleId = :roleId', { roleId });

    if (storeId) qb.andWhere('ur.storeId = :storeId', { storeId });
    return qb.execute();
  }
}
