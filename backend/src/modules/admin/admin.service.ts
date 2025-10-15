import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { AdminRepository } from 'src/modules/admin/admin.repository';
import { CreateAdminDto } from 'src/modules/admin/dto/create-admin.dto';
import { UpdateAdminDto } from 'src/modules/admin/dto/update-admin.dto';
import { AdminStats, FormattedAdmin } from 'src/modules/admin/types';
import { IUserService } from 'src/common/contracts/admin.contract';

@Injectable()
export class AdminService extends BaseService<
  Admin,
  CreateAdminDto,
  UpdateAdminDto
> {
  constructor(
    private readonly adminRepo: AdminRepository,
    @Inject(IUserService) private readonly userService: IUserService
  ) {
    super(adminRepo);
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    return await this.repository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async isUserValidAdmin(userId: string): Promise<boolean> {
    const admin = await this.findByUserId(userId);
    return !!(admin && admin.isActive);
  }

  /**
   * Get all active site administrators with formatted response
   */
  async getFormattedActiveAdmins(requestingUserId?: string): Promise<{
    admins: FormattedAdmin[];
    count: number;
    retrievedAt: string;
    retrievedBy?: string;
  }> {
    const admins = await this.getActiveAdmins();

    const formattedAdmins = admins.map((admin) => this.formatAdmin(admin));

    return {
      admins: formattedAdmins,
      count: formattedAdmins.length,
      retrievedAt: new Date().toISOString(),
      retrievedBy: requestingUserId,
    };
  }

  /**
   * Get all active site administrators
   */
  async getActiveAdmins(): Promise<Admin[]> {
    return this.adminRepo.find({
      where: { isActive: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get admin assignment history for a user with formatted response
   */
  async getFormattedAdminHistory(
    userId: string,
    requestingUserId?: string
  ): Promise<{
    userId: string;
    history: FormattedAdmin[];
    count: number;
    retrievedAt: string;
    retrievedBy?: string;
  }> {
    const history = await this.getAdminHistory(userId);

    const formattedHistory = history.map((admin) => this.formatAdmin(admin));

    return {
      userId,
      history: formattedHistory,
      count: formattedHistory.length,
      retrievedAt: new Date().toISOString(),
      retrievedBy: requestingUserId,
    };
  }

  /**
   * Get admin assignment history for a user
   */
  async getAdminHistory(userId: string): Promise<Admin[]> {
    return this.adminRepo.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get current user's admin history (limited fields)
   */
  async getMyAdminHistory(userId: string): Promise<{
    history: Array<{
      id: string;
      assignedBy?: string;
      assignedAt?: Date;
      revokedBy?: string;
      revokedAt?: Date;
      isActive: boolean;
      createdAt: Date;
      updatedAt?: Date;
    }>;
    count: number;
    retrievedAt: string;
  }> {
    const history = await this.getAdminHistory(userId);

    const formattedHistory = history.map((admin) => ({
      id: admin.id,
      assignedBy: admin.assignedBy,
      assignedAt: admin.assignedAt,
      revokedBy: admin.revokedBy,
      revokedAt: admin.revokedAt,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    }));

    return {
      history: formattedHistory,
      count: formattedHistory.length,
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Assign site admin role to user
   */
  async assignSiteAdminRole(
    userId: string,
    assignedByUser?: string
  ): Promise<Admin> {
    // Check if user exists
    const user = await this.userService.getEntityById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already an admin
    const existingAdmin = await this.findByUserId(userId);
    if (existingAdmin && existingAdmin.isActive) {
      throw new ConflictException('User is already a site administrator');
    }

    // If there's an inactive admin record, reactivate it
    if (existingAdmin && !existingAdmin.isActive) {
      return this.update(existingAdmin.id, {
        isActive: true,
        assignedByUser,
        assignedAt: new Date(),
        revokedBy: undefined,
        revokedAt: undefined,
      });
    }

    // Create new admin record
    const adminData: CreateAdminDto = {
      userId,
      assignedByUser,
      assignedAt: new Date(),
      isActive: true,
    };

    return this.create(adminData);
  }

  /**
   * Process admin role assignment with formatted response
   */
  async processAdminAssignment(
    userId: string,
    assignedBy: string
  ): Promise<{
    admin: {
      id: string;
      userId: string;
      assignedBy?: string;
      assignedAt?: Date;
      isActive: boolean;
    };
    message: string;
    assignedAt: string;
    assignedBy: string;
  }> {
    const admin = await this.assignSiteAdminRole(userId, assignedBy);

    return {
      admin: {
        id: admin.id,
        userId: admin.user?.id || userId,
        assignedBy: admin.assignedBy,
        assignedAt: admin.assignedAt,
        isActive: admin.isActive,
      },
      message: 'Admin role assigned successfully',
      assignedAt: new Date().toISOString(),
      assignedBy,
    };
  }

  /**
   * Revoke site admin role from user
   */
  async revokeSiteAdminRole(userId: string, revokedBy?: string): Promise<void> {
    const admin = await this.findByUserId(userId);
    if (!admin) {
      throw new NotFoundException('User is not a site administrator');
    }

    if (!admin.isActive) {
      throw new ConflictException('User admin role is already inactive');
    }

    await this.update(admin.id, {
      isActive: false,
      revokedBy,
      revokedAt: new Date(),
    });
  }

  /**
   * Process admin role revocation with formatted response
   */
  async processAdminRevocation(
    userId: string,
    revokedBy: string
  ): Promise<{
    message: string;
    userId: string;
    revokedBy: string;
    revokedAt: string;
  }> {
    await this.revokeSiteAdminRole(userId, revokedBy);

    return {
      message: 'Admin role revoked successfully',
      userId,
      revokedBy,
      revokedAt: new Date().toISOString(),
    };
  }

  /**
   * Check admin status for a user
   */
  async checkAdminStatus(
    userId: string,
    checkedBy?: string
  ): Promise<{
    userId: string;
    isAdmin: boolean;
    adminInfo: {
      id: string;
      assignedBy?: string;
      assignedAt?: Date;
      isActive: boolean;
      createdAt: Date;
    } | null;
    checkedAt: string;
    checkedBy?: string;
  }> {
    const isAdmin = await this.isUserValidAdmin(userId);
    const admin = await this.findByUserId(userId);

    return {
      userId,
      isAdmin,
      adminInfo: admin
        ? {
            id: admin.id,
            assignedBy: admin.assignedBy,
            assignedAt: admin.assignedAt,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
          }
        : null,
      checkedAt: new Date().toISOString(),
      checkedBy,
    };
  }

  /**
   * Get comprehensive admin statistics
   */
  async getAdminStats(generatedBy?: string): Promise<{
    stats: AdminStats;
    generatedAt: string;
    generatedBy?: string;
  }> {
    const [activeAdmins, allAdmins] = await Promise.all([
      this.getActiveAdmins(),
      this.findAll(),
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAssignments = allAdmins.filter((admin) => {
      const assignedAt = admin.assignedAt || admin.createdAt;
      return assignedAt && assignedAt > sevenDaysAgo;
    }).length;

    // Group by assignment date for trends
    const assignmentsByMonth: Record<string, number> = {};
    allAdmins.forEach((admin) => {
      const assignedAt = admin.assignedAt || admin.createdAt;
      if (assignedAt) {
        const monthKey = assignedAt.toISOString().substring(0, 7); // YYYY-MM
        assignmentsByMonth[monthKey] = (assignmentsByMonth[monthKey] || 0) + 1;
      }
    });

    const stats: AdminStats = {
      total: allAdmins.length,
      active: activeAdmins.length,
      inactive: allAdmins.length - activeAdmins.length,
      recentAssignments,
      trends: {
        assignmentsByMonth,
      },
    };

    return {
      stats,
      generatedAt: new Date().toISOString(),
      generatedBy,
    };
  }

  /**
   * Search admins by query
   */
  async searchAdmins(
    searchQuery: string,
    activeOnly: boolean = true,
    searchedBy?: string
  ): Promise<{
    searchQuery: string;
    results: FormattedAdmin[];
    count: number;
    searchedAt: string;
    searchedBy?: string;
  }> {
    if (!searchQuery || searchQuery.trim().length < 2) {
      throw new BadRequestException(
        'Search query must be at least 2 characters long'
      );
    }

    const admins = activeOnly
      ? await this.getActiveAdmins()
      : await this.findAll();

    const filteredAdmins = admins
      .filter((admin) => {
        if (activeOnly && !admin.isActive) return false;

        const user = admin.user;
        const query = searchQuery.toLowerCase().trim();

        return (
          user.email.toLowerCase().includes(query) ||
          (user.firstName && user.firstName.toLowerCase().includes(query)) ||
          (user.lastName && user.lastName.toLowerCase().includes(query)) ||
          `${user.firstName || ''} ${user.lastName || ''}`
            .toLowerCase()
            .includes(query)
        );
      })
      .map((admin) => this.formatAdmin(admin, true)); // Include fullName for search

    return {
      searchQuery,
      results: filteredAdmins,
      count: filteredAdmins.length,
      searchedAt: new Date().toISOString(),
      searchedBy,
    };
  }

  /**
   * Format admin object for consistent responses
   */
  private formatAdmin(
    admin: Admin,
    includeFullName: boolean = false
  ): FormattedAdmin {
    const formatted: FormattedAdmin = {
      id: admin.id,
      userId: admin.user.id,
      user: {
        id: admin.user.id,
        email: admin.user.email,
        firstName: admin.user.firstName,
        lastName: admin.user.lastName,
        isEmailVerified: admin.user.isEmailVerified,
      },
      assignedBy: admin.assignedBy,
      assignedAt: admin.assignedAt,
      revokedBy: admin.revokedBy,
      revokedAt: admin.revokedAt,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      metadata: admin.metadata,
    };

    if (includeFullName) {
      formatted.user.fullName =
        `${admin.user.firstName || ''} ${admin.user.lastName || ''}`.trim();
    }

    return formatted;
  }
}
