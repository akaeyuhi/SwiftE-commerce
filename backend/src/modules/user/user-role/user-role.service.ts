import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRoleRepository } from './user-role.repository';
import { UserRole } from 'src/entities/user/policy/user-role.entity';
import { BaseService } from 'src/common/abstracts/base.service';
import { CreateUserRoleDto } from './dto/create-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

@Injectable()
export class UserRoleService extends BaseService<
  UserRole,
  CreateUserRoleDto,
  UpdateUserRoleDto
> {
  constructor(private readonly userRoleRepo: UserRoleRepository) {
    super(userRoleRepo);
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
      relations: ['user', 'store'],
    });
  }

  async update(userId: string, dto: UpdateUserRoleDto): Promise<UserRole> {
    const { store, roleName } = dto;
    const role = await this.findByStoreUser(userId, store!.id);
    if (!role) throw new NotFoundException(`Such role doesnt exist`);
    return await this.userRoleRepo.save({ ...role, roleName });
  }

  /**
   * Assign store role to user
   */
  async assignStoreRole(
    userId: string,
    storeId: string,
    roleName: StoreRoles,
    assignedBy?: string
  ): Promise<UserRole> {
    const existingRole = await this.findByStoreUser(userId, storeId);

    if (existingRole) {
      return this.userRoleRepo.save({
        ...existingRole,
        roleName,
        assignedBy,
        assignedAt: new Date(),
        isActive: true,
      });
    }

    // Create new role assignment
    const createDto: CreateUserRoleDto = {
      userId,
      storeId,
      roleName,
      assignedBy,
      assignedAt: new Date(),
      isActive: true,
    };

    return this.create(createDto);
  }

  /**
   * Revoke store role from user
   */
  async revokeStoreRole(
    userId: string,
    storeId: string,
    revokedBy?: string
  ): Promise<void> {
    const role = await this.findByStoreUser(userId, storeId);
    if (!role) {
      throw new NotFoundException('User does not have a role in this store');
    }

    await this.userRoleRepo.save({
      ...role,
      isActive: false,
      revokedBy,
      revokedAt: new Date(),
    });
  }

  /**
   * Get all users with roles in a store
   */
  async getStoreRoles(storeId: string): Promise<UserRole[]> {
    return this.userRoleRepo.find({
      where: {
        store: { id: storeId },
        isActive: true,
      },
      relations: ['user', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all stores where user has roles
   */
  async getUserStoreRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepo.find({
      where: {
        user: { id: userId },
        isActive: true,
      },
      relations: ['user', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user has specific role in store
   */
  async userHasStoreRole(
    userId: string,
    storeId: string,
    roleName: StoreRoles
  ): Promise<boolean> {
    const role = await this.findByStoreUser(userId, storeId);
    return role?.roleName === roleName && role?.isActive;
  }

  /**
   * Check if user has any admin-level role in store
   */
  async userIsStoreAdmin(userId: string, storeId: string): Promise<boolean> {
    return this.userHasStoreRole(userId, storeId, StoreRoles.ADMIN);
  }

  /**
   * Check if user has admin or moderator role in store
   */
  async userCanModerateStore(
    userId: string,
    storeId: string
  ): Promise<boolean> {
    const role = await this.findByStoreUser(userId, storeId);
    if (!role || !role.isActive) return false;

    return (
      role.roleName === StoreRoles.ADMIN ||
      role.roleName === StoreRoles.MODERATOR
    );
  }

  /**
   * Get role statistics for a store
   */
  async getStoreRoleStats(storeId: string): Promise<{
    total: number;
    byRole: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    const allRoles = await this.userRoleRepo.find({
      where: { store: { id: storeId } },
    });

    const byRole: Record<string, number> = {};
    let active = 0;
    let inactive = 0;

    allRoles.forEach((role) => {
      byRole[role.roleName] = (byRole[role.roleName] || 0) + 1;
      if (role.isActive) {
        active++;
      } else {
        inactive++;
      }
    });

    return {
      total: allRoles.length,
      byRole,
      active,
      inactive,
    };
  }
}
