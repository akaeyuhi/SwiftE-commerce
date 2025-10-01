import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { BaseController } from 'src/common/abstracts/base.controller';
import { User } from 'src/entities/user/user.entity';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { RoleDto } from 'src/modules/user/dto/role.dto';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
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

  /**
   * Legacy method for backward compatibility
   * @deprecated Use AuthController assignRole instead
   */
  @Post(':id/roles')
  @StoreRole(StoreRoles.ADMIN)
  @AdminRole(AdminRoles.ADMIN)
  async assignRole(@Param('id') userId: string, @Body() dto: RoleDto) {
    return this.userService.assignStoreRole(
      userId,
      dto.roleName,
      dto.storeId,
      dto.assignedBy
    );
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use AuthController revokeRole instead
   */
  @Delete(':id/roles')
  @StoreRole(StoreRoles.ADMIN)
  @AdminRole(AdminRoles.ADMIN)
  async revokeStoreRole(@Param('id') userId: string, @Body() dto: RoleDto) {
    return this.userService.revokeStoreRole(userId, dto.roleName, dto.storeId);
  }

  @Post(':id/stores')
  async createStore(@Param('id') userId: string, @Body() dto: CreateStoreDto) {
    return this.userService.createStore(userId, dto);
  }
}
