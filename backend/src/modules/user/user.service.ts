import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from 'src/modules/user/user.repository';
import { BaseService } from 'src/common/abstracts/base.service';

import { User } from 'src/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserMapper } from 'src/modules/user/user.mapper';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/entities/user-role.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { StoreService } from 'src/modules/store/store.service';
import { StoreDto } from 'src/modules/store/dto/store.dto';
import { UserRoleService } from 'src/modules/user-role/user-role.service';
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
    private readonly userRoleService: UserRoleService,
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

  // Additional methods:
  async assignRole(
    userId: string,
    roleName: StoreRoles,
    storeId: string
  ): Promise<UserRole> {
    // validate user & store existence
    const user = await this.getEntityById(userId);
    if (!user) throw new NotFoundException('User not found');

    const store = await this.storeService.getEntityById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const exists = await this.userRoleService.findByStoreUser(userId, storeId);
    if (exists) throw new BadRequestException('Role already assigned');

    const userRole = await this.userRoleService.create({
      roleName,
      user,
      store,
    });
    await this.userRepo.addRoleToUser(user, userRole);
    return userRole;
  }

  async revokeRole(
    userId: string,
    roleId: string,
    storeId?: string
  ): Promise<void> {
    await this.userRepo.removeRoleFromUser(userId, roleId, storeId);
  }

  // create a store and give STORE_ADMIN to owner
  async createStore(ownerId: string, dto: CreateStoreDto): Promise<StoreDto> {
    const owner = await this.getEntityById(ownerId);
    if (!owner) throw new NotFoundException('Store owner not found');

    dto.ownerUser = owner;

    const store = await this.storeService.create(dto);

    await this.assignRole(owner.id, StoreRoles.ADMIN, store.id!);

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

  async logAiUsage(userId: string, feature: string, details: any) {
    // TODO: save AiLog entity
  }
}
