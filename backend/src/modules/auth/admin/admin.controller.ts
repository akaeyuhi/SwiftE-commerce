// src/modules/auth/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { BaseController } from 'src/common/abstracts/base.controller';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';

/**
 * Admin Controller
 *
 * Handles HTTP requests for admin management.
 * All business logic is delegated to AdminService.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController extends BaseController<
  Admin,
  CreateAdminDto,
  UpdateAdminDto
> {
  static accessPolicies: AccessPolicies = {
    getActiveAdmins: { adminRole: AdminRoles.ADMIN },
    getAdminHistory: { adminRole: AdminRoles.ADMIN },
    assignAdminRole: { adminRole: AdminRoles.ADMIN },
    revokeAdminRole: { adminRole: AdminRoles.ADMIN },
    getMyAdminHistory: { requireAuthenticated: true },
    getAdminStats: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly adminService: AdminService) {
    super(adminService);
  }

  /**
   * GET /admin/active
   */
  @Get('active')
  @AdminRole(AdminRoles.ADMIN)
  async getActiveAdmins(@Req() req: Request) {
    const requestingUserId = (req.user as any)?.id;
    const result =
      await this.adminService.getFormattedActiveAdmins(requestingUserId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /admin/history/:userId
   */
  @Get('history/:userId')
  @AdminRole(AdminRoles.ADMIN)
  async getAdminHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request
  ) {
    const requestingUserId = (req.user as any)?.id;
    const result = await this.adminService.getFormattedAdminHistory(
      userId,
      requestingUserId
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /admin/my-history
   */
  @Get('my-history')
  async getMyAdminHistory(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    const result = await this.adminService.getMyAdminHistory(userId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /admin/assign
   */
  @Post('assign')
  @AdminRole(AdminRoles.ADMIN)
  async assignAdminRole(
    @Body(ValidationPipe) dto: CreateAdminDto,
    @Req() req: Request
  ) {
    const assignedBy = (req.user as any)?.id;
    const result = await this.adminService.processAdminAssignment(
      dto.userId,
      assignedBy
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * DELETE /admin/revoke/:userId
   */
  @Delete('revoke/:userId')
  @AdminRole(AdminRoles.ADMIN)
  async revokeAdminRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request
  ) {
    const revokedBy = (req.user as any)?.id;
    const result = await this.adminService.processAdminRevocation(
      userId,
      revokedBy
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /admin/check/:userId
   */
  @Get('check/:userId')
  @AdminRole(AdminRoles.ADMIN)
  async checkAdminStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request
  ) {
    const checkedBy = (req.user as any)?.id;
    const result = await this.adminService.checkAdminStatus(userId, checkedBy);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /admin/stats
   */
  @Get('stats')
  @AdminRole(AdminRoles.ADMIN)
  async getAdminStats(@Req() req: Request) {
    const generatedBy = (req.user as any)?.id;
    const result = await this.adminService.getAdminStats(generatedBy);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /admin/search
   */
  @Get('search')
  @AdminRole(AdminRoles.ADMIN)
  async searchAdmins(
    @Query('q') searchQuery: string,
    @Query('active') activeOnly: boolean = true,
    @Req() req: Request
  ) {
    const searchedBy = (req.user as any)?.id;
    const result = await this.adminService.searchAdmins(
      searchQuery,
      activeOnly,
      searchedBy
    );

    return {
      success: true,
      data: result,
    };
  }
}
