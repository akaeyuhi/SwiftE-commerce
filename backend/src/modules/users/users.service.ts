import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { BaseService } from 'src/common/abstracts/base.service';

import { User } from 'src/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UsersMapper } from 'src/modules/users/mappers/users.mapper';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService extends BaseService<
  User,
  UserDto,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    private readonly userRepo: UsersRepository,
    protected readonly mapper: UsersMapper
  ) {
    super(mapper);
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepo.find();
    return this.mapper.toDtoList(users);
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return this.mapper.toDto(user);
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

  async remove(id: string): Promise<void> {
    const res = await this.userRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException('User not found');
  }

  // Additional methods:
  async assignRole(userId: string, roleId: string, storeId?: string) {
    // TODO: load user, role, create UserRole entity
  }

  async createStore(userId: string, createStoreDto: any) {
    // TODO: instantiate and save Store entity with owner user
  }

  async logAiUsage(userId: string, feature: string, details: any) {
    // TODO: save AiLog entity
  }
}
