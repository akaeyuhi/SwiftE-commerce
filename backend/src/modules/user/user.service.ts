import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { UserRepository } from 'src/modules/user/user.repository';
import { BaseService } from 'src/common/abstracts/base.service';

import { User } from 'src/entities/user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserMapper } from 'src/modules/user/user.mapper';
import * as bcrypt from 'bcrypt';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { StoreService } from 'src/modules/store/store.service';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AvatarService } from './avatar/avatar.service';
import { UserStatsDto } from './dto/user-stats.dto';
import { Order } from 'src/entities/store/product/order.entity';
import { Review } from 'src/entities/store/review.entity';
import { Like } from 'src/entities/user/like.entity';
import { Store } from 'src/entities/store/store.entity';

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
    protected readonly mapper: UserMapper,
    private readonly avatarService: AvatarService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>
  ) {
    super(userRepo, mapper);
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const user = this.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const totalOrders = await this.orderRepository.count({ where: { userId } });
    const reviewsWritten = await this.reviewRepository.count({
      where: { userId },
    });
    const likedProducts = await this.likeRepository.count({
      where: { userId, productId: Not(IsNull()) },
    });
    const followedStores = await this.likeRepository.count({
      where: { userId, storeId: Not(IsNull()) },
    });

    return {
      totalOrders,
      reviewsWritten,
      likedProducts,
      followedStores,
    };
  }

  async uploadAvatar(
    userId: string,
    avatarFile: Express.Multer.File
  ): Promise<UserDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.avatarUrl = await this.avatarService.saveFile(avatarFile, userId);

    const updatedUser = await this.userRepo.save(user);
    return this.mapper.toDto(updatedUser);
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already in use');
    const user = this.mapper.toEntity(dto as any);
    user.passwordHash = await bcrypt.hash(dto.password, 10);
    const saved = await this.userRepo.save(user);
    return this.mapper.toDto(saved);
  }

  async findUser(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  async getDashboardUser(id: string): Promise<User | null> {
    return this.userRepo.getDashboardUser(id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ${id} not found`);
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);
    return this.mapper.toDto(updated);
  }

  async findByEmail(email: string): Promise<UserDto> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) throw new NotFoundException(`User with ${email} not found`);
    return this.mapper.toDto(user);
  }

  async findUserWithPassword(email: string) {
    return this.userRepo.getUserWithPassword(email);
  }

  async findOneWithRelations(id: string): Promise<User> {
    const user = await this.userRepo.findOneWithRelations(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findOneWithRoles(id: string): Promise<User> {
    const user = await this.userRepo.findOneWithRelations(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async assignStoreRole(
    userId: string,
    roleName: StoreRoles,
    storeId: string,
    assignedBy?: string
  ): Promise<StoreRole> {
    const user = await this.findOneWithRoles(userId);
    if (!user) throw new NotFoundException('User not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const exists = await this.storeRoleService.findByStoreUser(userId, storeId);
    if (exists) throw new BadRequestException('Role already assigned');

    return await this.storeRoleService.assignStoreRole(
      userId,
      storeId,
      roleName,
      assignedBy
    );
  }

  async revokeStoreRole(
    userId: string,
    roleName: StoreRoles,
    storeId?: string
  ): Promise<{ success: true }> {
    try {
      await this.userRepo.removeRoleFromUser(userId, roleName, storeId);
      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createStore(
    ownerId: string,
    dto: CreateStoreDto,
    logoFile?: Express.Multer.File,
    bannerFile?: Express.Multer.File
  ): Promise<StoreDto> {
    const owner = await this.findOneWithRelations(ownerId);
    if (!owner) throw new NotFoundException('Store owner not found');

    const store = await this.storeService.create({
      ...dto,
      ownerId,
      logoFile,
      bannerFile,
    });

    await this.assignStoreRole(owner.id, StoreRoles.ADMIN, store.id!);

    return store;
  }

  async getUserStoreRoles(userId: string) {
    const user = await this.findOneWithRoles(userId);
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
    avatarUrl?: string;
    ownedStores: Store[];
    roles?: any[];
    likes?: Like[];
    createdAt: Date;
    updatedAt?: Date;
  } | null> {
    const user = await this.findOneWithRelations(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified || false,
      emailVerifiedAt: user.emailVerifiedAt,
      ownedStores: user.ownedStores,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((role) => ({
        storeId: role.store.id,
        store: role.store,
        isActive: role.isActive,
        storeName: role.store.name,
        roleName: role.roleName,
        assignedAt: role.assignedAt,
      })),
      likes: user.likes,
      updatedAt: user.updatedAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user's basic info
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileDto
  ): Promise<User | null> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, updates);
    return this.getEntityById(userId);
  }

  async getOrdersForUser(
    userId: string,
    pagination: any
  ): Promise<[Order[], number]> {
    const { skip, take } = pagination;
    return this.orderRepository.findAndCount({
      where: { userId },
      relations: ['store', 'items'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
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
