import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Req,
  BadRequestException,
  ParseUUIDPipe,
  ParseEnumPipe,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
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
import { Request } from 'express';
import { UploadAvatar } from 'src/common/decorators/upload-avatar.decorator';
import { UploadStoreFiles } from 'src/common/decorators/upload-store-files.decorator';

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

  @Post('profile/avatar')
  @UploadAvatar()
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File
  ): Promise<UserDto> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    if (!file) {
      throw new BadRequestException('Avatar file not provided');
    }
    return this.userService.uploadAvatar(userId, file);
  }

  @Post()
  async register(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.userService.create(dto);
  }

  /**
   * Get current user's profile
   */
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    return this.userService.getProfile(userId);
  }

  /**
   * Update current user's profile
   */
  @Put('profile')
  async updateProfile(@Req() req: Request, @Body() updates: UpdateProfileDto) {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    return this.userService.updateProfile(userId, updates);
  }

  /**
   * Get user profile by ID (admin only)
   */
  @Get(':id/profile')
  @AdminRole(AdminRoles.ADMIN)
  async getUserProfile(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.userService.getProfile(userId);
  }

  /**
   * Mark user's email as verified
   */
  @Post(':id/verify-email')
  @AdminRole(AdminRoles.ADMIN)
  async markAsVerified(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.userService.markAsVerified(userId);
  }

  /**
   * Check if user's email is verified
   */
  @Get(':id/email-verified')
  async isEmailVerified(@Param('id', new ParseUUIDPipe()) userId: string) {
    const isVerified = await this.userService.isEmailVerified(userId);
    return { isEmailVerified: isVerified };
  }

  /**
   * Check if user has specific store role
   */
  @Get(':id/stores/:storeId/roles/:roleName/check')
  async userHasStoreRole(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('roleName', new ParseEnumPipe(StoreRoles)) roleName: StoreRoles
  ) {
    const hasRole = await this.userService.userHasStoreRole(
      userId,
      storeId,
      roleName
    );
    return { hasRole };
  }

  /**
   * Check if user is store admin
   */
  @Get(':id/stores/:storeId/admin/check')
  async userIsStoreAdmin(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Param('storeId', new ParseUUIDPipe()) storeId: string
  ) {
    const isAdmin = await this.userService.userIsStoreAdmin(userId, storeId);
    return { isStoreAdmin: isAdmin };
  }

  /**
   * Get user's store roles
   */
  @Get(':id/store-roles')
  async getUserStoreRoles(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.userService.getUserStoreRoles(userId);
  }

  /**
   * Check if user is site admin
   */
  @Get(':id/site-admin/check')
  @AdminRole(AdminRoles.ADMIN)
  async isUserSiteAdmin(@Param('id', new ParseUUIDPipe()) userId: string) {
    const isSiteAdmin = await this.userService.isUserSiteAdmin(userId);
    return { isSiteAdmin };
  }

  /**
   * Assign site admin role
   */
  @Post(':id/site-admin')
  @AdminRole(AdminRoles.ADMIN)
  async assignSiteAdminRole(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.userService.assignSiteAdminRole(userId);
  }

  /**
   * Deactivate user account
   */
  @Post(':id/deactivate')
  @AdminRole(AdminRoles.ADMIN)
  async deactivateAccount(@Param('id', new ParseUUIDPipe()) userId: string) {
    await this.userService.deactivateAccount(userId);
    return { message: 'Account deactivated successfully' };
  }

  /**
   * Reactivate user account
   */
  @Post(':id/reactivate')
  @AdminRole(AdminRoles.ADMIN)
  async reactivateAccount(@Param('id', new ParseUUIDPipe()) userId: string) {
    await this.userService.reactivateAccount(userId);
    return { message: 'Account reactivated successfully' };
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use AuthController assignRole instead
   */
  @Post(':id/roles')
  @StoreRole(StoreRoles.ADMIN)
  @AdminRole(AdminRoles.ADMIN)
  async assignRole(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: RoleDto
  ) {
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
  async revokeStoreRole(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: RoleDto
  ) {
    return this.userService.revokeStoreRole(userId, dto.roleName, dto.storeId);
  }

  @Post(':id/stores')
  @UploadStoreFiles()
  async createStore(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: CreateStoreDto,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] }
  ) {
    const logoFile = files.logo ? files.logo[0] : undefined;
    const bannerFile = files.banner ? files.banner[0] : undefined;
    return this.userService.createStore(userId, dto, logoFile, bannerFile);
  }
}
