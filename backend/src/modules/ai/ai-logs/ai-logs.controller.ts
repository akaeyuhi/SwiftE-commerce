import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  ValidationPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AiLogsService } from './ai-logs.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  CleanupLogsDto,
  CreateAiLogDto,
  LogQueryDto,
  UsageStatsQueryDto,
} from 'src/modules/ai/ai-logs/dto/create-ai-log.dto';

/**
 * Enhanced AI Logs Controller
 *
 * Provides comprehensive AI usage logging and analytics with:
 * - Log creation and querying
 * - Usage statistics and trends
 * - Error tracking and monitoring
 * - Data cleanup and maintenance
 *
 * Security:
 * - Users can only access their own logs
 * - Store admins can access store-wide logs
 * - Site admins have full access
 */
@Controller('ai/logs')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class AiLogsController {
  static accessPolicies: AccessPolicies = {
    // Log management
    createLog: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    getLogs: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

    // Analytics
    getUsageStats: { storeRoles: [StoreRoles.ADMIN] },
    getTopFeatures: { storeRoles: [StoreRoles.ADMIN] },
    getDailyUsage: { storeRoles: [StoreRoles.ADMIN] },
    getErrorLogs: { storeRoles: [StoreRoles.ADMIN] },
    getUsageTrends: { storeRoles: [StoreRoles.ADMIN] },

    // System management - admin only
    healthCheck: { adminRole: AdminRoles.ADMIN },
    cleanupLogs: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly logsService: AiLogsService) {}

  /**
   * POST /ai/logs
   * Create an AI usage log entry
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLog(
    @Body(ValidationPipe) dto: CreateAiLogDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const log = await this.logsService.record({
        userId: dto.userId || user.id,
        storeId: dto.storeId || user.storeId,
        feature: dto.feature,
        prompt: dto.prompt,
        details: dto.details,
      });

      return {
        success: true,
        data: {
          logId: log.id,
          createdAt: log.createdAt,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create log: ${error.message}`);
    }
  }

  /**
   * GET /ai/logs
   * Query AI usage logs with filtering
   */
  @Get()
  async getLogs(
    @Query(ValidationPipe) query: LogQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      // Apply security filters based on user permissions
      const filters = this.buildSecurityFilters(query, user);

      const logs = await this.logsService.findByFilter(filters, {
        limit: query.limit || 100,
        offset: query.offset || 0,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        feature: query.feature,
        hasDetails: query.hasDetails,
      });

      return {
        success: true,
        data: {
          logs,
          metadata: {
            count: logs.length,
            filters,
            retrievedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve logs: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/logs/stats
   * Get comprehensive usage statistics
   */
  @Get('stats')
  @StoreRole(StoreRoles.ADMIN)
  async getUsageStats(
    @Query(ValidationPipe) query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const filters = this.buildSecurityFilters(query, user);

      const stats = await this.logsService.getUsageStats({
        ...filters,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      return {
        success: true,
        data: {
          stats,
          metadata: {
            period: {
              from: query.dateFrom,
              to: query.dateTo,
            },
            filters,
            generatedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get usage stats: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/logs/features/top
   * Get top AI features by usage
   */
  @Get('features/top')
  @StoreRole(StoreRoles.ADMIN)
  async getTopFeatures(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query(ValidationPipe) query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);
      const filters = this.buildSecurityFilters(query, user);

      const topFeatures = await this.logsService.getTopFeatures(limit, {
        ...filters,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      return {
        success: true,
        data: {
          features: topFeatures,
          metadata: {
            limit,
            generatedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top features: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/logs/daily
   * Get daily usage metrics
   */
  @Get('daily')
  @StoreRole(StoreRoles.ADMIN)
  async getDailyUsage(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
    @Query(ValidationPipe) query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);
      const filters = this.buildSecurityFilters(query, user);

      const dailyUsage = await this.logsService.getDailyUsage(days, filters);

      return {
        success: true,
        data: {
          dailyUsage,
          metadata: {
            days,
            generatedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get daily usage: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/logs/errors
   * Get error logs for debugging
   */
  @Get('errors')
  @StoreRole(StoreRoles.ADMIN)
  async getErrorLogs(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 100,
    @Query(ValidationPipe) query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);
      const filters = this.buildSecurityFilters(query, user);

      const errorLogs = await this.logsService.getErrorLogs(limit, {
        ...filters,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      return {
        success: true,
        data: {
          errorLogs,
          metadata: {
            count: errorLogs.length,
            limit,
            generatedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get error logs: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/logs/trends
   * Get usage trends and insights
   */
  @Get('trends')
  @StoreRole(StoreRoles.ADMIN)
  async getUsageTrends(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
    @Query(ValidationPipe) query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);
      const filters = this.buildSecurityFilters(query, user);

      const trends = await this.logsService.getUsageTrends(days, filters);

      return {
        success: true,
        data: {
          trends,
          metadata: {
            period: days,
            generatedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get usage trends: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/logs/health
   * Health check for logs service
   */
  @Get('health')
  @AdminRole(AdminRoles.ADMIN)
  async healthCheck() {
    try {
      const health = await this.logsService.healthCheck();

      return {
        success: true,
        data: {
          service: 'ai-logs',
          ...health,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          service: 'ai-logs',
          healthy: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * POST /ai/logs/cleanup
   * Cleanup old logs (admin only)
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @AdminRole(AdminRoles.ADMIN)
  async cleanupLogs(@Body(ValidationPipe) dto: CleanupLogsDto) {
    try {
      const result = await this.logsService.cleanup(
        dto.retentionDays || 30,
        dto.dryRun || false
      );

      return {
        success: true,
        data: {
          ...result,
          cleanupAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Cleanup failed: ${error.message}`);
    }
  }

  private extractUser(req: Request): {
    id: string;
    storeId?: string;
    isAdmin?: boolean;
  } {
    const user = (req as any).user;
    if (!user?.id) {
      throw new BadRequestException('User context not found');
    }
    return {
      id: user.id,
      storeId: user.storeId,
      isAdmin: user.isAdmin || user.roles?.includes('admin'),
    };
  }

  private buildSecurityFilters(
    query: any,
    user: { id: string; storeId?: string; isAdmin?: boolean }
  ) {
    const filters: any = {};

    // If user is not admin, restrict to their data
    if (!user.isAdmin) {
      if (user.storeId) {
        filters.storeId = user.storeId;
      } else {
        filters.userId = user.id;
      }
    } else {
      // Admins can filter by specific store/user if provided
      if (query.storeId) filters.storeId = query.storeId;
      if (query.userId) filters.userId = query.userId;
    }

    return filters;
  }
}
