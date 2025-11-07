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
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from 'src/modules/admin/admin.service';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { BaseController } from 'src/common/abstracts/base.controller';
import { CreateAdminDto } from 'src/modules/admin/dto/create-admin.dto';
import { UpdateAdminDto } from 'src/modules/admin/dto/update-admin.dto';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';

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
    getMyAdminHistory: {
      adminRole: AdminRoles.ADMIN,
      requireAuthenticated: true,
    },
    checkAdminStatus: { adminRole: AdminRoles.ADMIN },
    getAdminStats: { adminRole: AdminRoles.ADMIN },
    searchAdmins: { adminRole: AdminRoles.ADMIN },
    getDashboardStats: { adminRole: AdminRoles.ADMIN },
    getRecentActivities: { adminRole: AdminRoles.ADMIN },
    getPendingActions: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly adminService: AdminService) {
    super(adminService);
  }

  @Get('dashboard-stats')
  async getDashboardStats() {
    const result = await this.adminService.getDashboardStats();
    return {
      success: true,
      data: result,
    };
  }

  @Get('recent-activities')
  async getRecentActivities() {
    const result = await this.adminService.getRecentActivities();
    return {
      success: true,
      data: result,
    };
  }

  @Get('pending-actions')
  async getPendingActions() {
    const result = await this.adminService.getPendingActions();
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /admin/active
   */
  @Get('active')
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
  async assignAdminRole(@Body() dto: CreateAdminDto, @Req() req: Request) {
    const assignedBy = dto.assignedBy ?? (req.user as any)?.id;
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
