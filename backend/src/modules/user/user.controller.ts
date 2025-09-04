import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { BaseController } from 'src/common/abstracts/base.controller';
import { User } from 'src/entities/user.entity';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { RoleDto } from 'src/modules/user/dto/role.dto';
import { AdminRole } from 'src/common/decorators/admin.decorator';
import { AdminRoles } from 'src/common/enums/admin.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, StoreRolesGuard, AdminGuard)
export class UserController extends BaseController<
  User,
  CreateUserDto,
  UpdateUserDto,
  UserDto
> {
  constructor(private readonly userService: UserService) {
    super(userService);
  }

  @Post()
  async register(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.userService.create(dto);
  }

  @Get()
  @StoreRole(StoreRoles.ADMIN)
  async findAll(): Promise<UserDto[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserDto> {
    return this.userService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ): Promise<UserDto> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }

  @Post(':id/roles')
  @StoreRole(StoreRoles.ADMIN) // only app admins can assign global or arbitrary roles
  @AdminRole(AdminRoles.ADMIN)
  async assignRole(@Param('id') userId: string, @Body() dto: RoleDto) {
    return this.userService.assignRole(userId, dto.roleName, dto.storeId);
  }

  @Delete(':id/roles')
  @StoreRole(StoreRoles.ADMIN)
  @AdminRole(AdminRoles.ADMIN)
  async revokeStoreRole(@Param('id') userId: string, @Body() dto: RoleDto) {
    return this.userService.revokeRole(userId, dto.roleName, dto.storeId);
  }

  @Post(':id/stores')
  async createStore(@Param('id') userId: string, @Body() dto: CreateStoreDto) {
    // ensure the caller is the same user or app admin
    return this.userService.createStore(userId, dto);
  }

  // Additional endpoints:
  // POST /users/:id/ai-logs
}
