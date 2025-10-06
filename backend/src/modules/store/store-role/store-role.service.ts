import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreRoleRepository } from 'src/modules/store/store-role/store-role.repository';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { BaseService } from 'src/common/abstracts/base.service';
import { CreateStoreRoleDto } from 'src/modules/store/store-role/dto/create-store-role.dto';
import { UpdateStoreRoleDto } from 'src/modules/store/store-role/dto/update-store-role.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

@Injectable()
export class StoreRoleService extends BaseService<
  StoreRole,
  CreateStoreRoleDto,
  UpdateStoreRoleDto
> {
  constructor(private readonly storeRoleRepo: StoreRoleRepository) {
    super(storeRoleRepo);
  }

  async findByStoreUser(
    userId: string,
    storeId: string
  ): Promise<StoreRole | null> {
    return this.storeRoleRepo.findOne({
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

  async update(userId: string, dto: UpdateStoreRoleDto): Promise<StoreRole> {
    const { store, roleName } = dto;
    const role = await this.findByStoreUser(userId, store!.id);
    if (!role) throw new NotFoundException(`Such role doesnt exist`);
    return await this.storeRoleRepo.save({ ...role, roleName });
  }

  /**
   * Assign store role to user
   */
  async assignStoreRole(
    userId: string,
    storeId: string,
    roleName: StoreRoles,
    assignedBy?: string
  ): Promise<StoreRole> {
    const existingRole = await this.findByStoreUser(userId, storeId);

    if (existingRole) {
      return this.storeRoleRepo.save({
        ...existingRole,
        roleName,
        assignedBy,
        assignedAt: new Date(),
        isActive: true,
      });
    }

    // Create new role assignment
    const createDto: CreateStoreRoleDto = {
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

    await this.storeRoleRepo.save({
      ...role,
      isActive: false,
      revokedBy,
      revokedAt: new Date(),
    });
  }

  /**
   * Get all users with roles in a store
   */
  async getStoreRoles(storeId: string): Promise<StoreRole[]> {
    return this.storeRoleRepo.find({
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
  async getUserStoreRoles(userId: string): Promise<StoreRole[]> {
    return this.storeRoleRepo.find({
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
    const allRoles = await this.storeRoleRepo.find({
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
