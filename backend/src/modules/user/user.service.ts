import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from 'src/modules/user/user.repository';
import { BaseService } from 'src/common/abstracts/base.service';

import { User } from 'src/entities/user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserMapper } from 'src/modules/user/user.mapper';
import * as bcrypt from 'bcrypt';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { StoreService } from 'src/modules/store/store.service';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';

@Injectable()
export class UserService extends BaseService<
  User,
  CreateUserDto,
  UpdateUserDto,
  UserDto
> {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly storeRoleService: StoreRoleService,
    private readonly storeService: StoreService,
    protected readonly mapper: UserMapper
  ) {
    super(userRepo, mapper);
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already in use');
    const user = this.mapper.toEntity(dto as any);
    user.passwordHash = await bcrypt.hash(dto.password, 10);
    const saved = await this.userRepo.save(user);
    return this.mapper.toDto(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);
    return this.mapper.toDto(updated);
  }

  async findByEmail(email: string): Promise<UserDto> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) throw new NotFoundException('User not found');
    return this.mapper.toDto(user);
  }

  async findUserWithPassword(email: string) {
    return this.userRepo.getUserWithPassword(email);
  }

  async findOneWithRelations(id: string): Promise<User> {
    const user = await this.userRepo.findOneWithRelations(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async assignStoreRole(
    userId: string,
    roleName: StoreRoles,
    storeId: string,
    assignedBy?: string
  ): Promise<StoreRole> {
    const user = await this.getEntityById(userId);
    if (!user) throw new NotFoundException('User not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const exists = await this.storeRoleService.findByStoreUser(userId, storeId);
    if (exists) throw new BadRequestException('Role already assigned');

    const userRole = await this.storeRoleService.assignStoreRole(
      userId,
      storeId,
      roleName,
      assignedBy
    );
    await this.userRepo.addRoleToUser(user, userRole);
    return userRole;
  }

  async revokeStoreRole(
    userId: string,
    roleId: string,
    storeId?: string
  ): Promise<void> {
    await this.userRepo.removeRoleFromUser(userId, roleId, storeId);
  }

  async createStore(ownerId: string, dto: CreateStoreDto): Promise<StoreDto> {
    const owner = await this.getEntityById(ownerId);
    if (!owner) throw new NotFoundException('Store owner not found');

    dto.owner = owner;

    const store = await this.storeService.create(dto);

    await this.assignStoreRole(owner.id, StoreRoles.ADMIN, store.id!);

    return store;
  }

  async getUserStoreRoles(userId: string) {
    const user = await this.findOneWithRelations(userId);
    return user.roles;
  }

  async isUserSiteAdmin(userId: string) {
    const user = await this.findOneWithRelations(userId);
    return user.siteRole === AdminRoles.ADMIN;
  }

  async assignSiteAdminRole(userId: string) {
    const user = await this.getEntityById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.update(userId, { siteRole: AdminRoles.ADMIN });
  }

  /**
   * Mark user's email as verified
   */
  async markAsVerified(userId: string): Promise<User | null> {
    const user = await this.getEntityById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return user; // Already verified
    }

    await this.userRepo.update(userId, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    return this.getEntityById(userId);
  }

  /**
   * Check if user email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const user = await this.getEntityById(userId);
    return user?.isEmailVerified || false;
  }

  /**
   * Check if user has specific store role (delegates to UserRoleService)
   */
  async userHasStoreRole(
    userId: string,
    storeId: string,
    roleName: StoreRoles
  ): Promise<boolean> {
    return this.storeRoleService.userHasStoreRole(userId, storeId, roleName);
  }

  /**
   * Check if user is store admin (delegates to UserRoleService)
   */
  async userIsStoreAdmin(userId: string, storeId: string): Promise<boolean> {
    return this.storeRoleService.userIsStoreAdmin(userId, storeId);
  }

  /**
   * Get user's basic profile info
   */
  async getProfile(userId: string): Promise<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
    emailVerifiedAt?: Date;
    storeRoles?: any[];
    createdAt: Date;
  } | null> {
    const user = await this.getEntityById(userId);
    if (!user) return null;

    const storeRoles = await this.getUserStoreRoles(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified || false,
      emailVerifiedAt: user.emailVerifiedAt,
      storeRoles: storeRoles.map((role) => ({
        storeId: role.store.id,
        storeName: role.store.name,
        roleName: role.roleName,
        assignedAt: role.assignedAt,
      })),
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user's basic info
   */
  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
    }
  ): Promise<User | null> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, updates);
    return this.getEntityById(userId);
  }

  /**
   * Soft delete user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, {
      isActive: false,
      deactivatedAt: new Date(),
    });
  }

  /**
   * Reactivate user account
   */
  async reactivateAccount(userId: string): Promise<void> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, {
      isActive: true,
      deactivatedAt: undefined,
    });
  }
}
