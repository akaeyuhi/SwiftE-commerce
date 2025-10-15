import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { AiLogsService } from './ai-logs.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
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
 * AI Logs Controller
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
@Controller('stores/:storeId/ai/logs/')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class AiLogsController {
  static accessPolicies: AccessPolicies = {
    // Log management
    createLog: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
      requireAuthenticated: true,
    },
    getLogs: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
      requireAuthenticated: true,
    },

    // Analytics
    getUsageStats: {
      storeRoles: [StoreRoles.ADMIN],
      requireAuthenticated: true,
    },
    getTopFeatures: {
      storeRoles: [StoreRoles.ADMIN],
      requireAuthenticated: true,
    },
    getDailyUsage: {
      storeRoles: [StoreRoles.ADMIN],
      requireAuthenticated: true,
    },
    getErrorLogs: {
      storeRoles: [StoreRoles.ADMIN],
      requireAuthenticated: true,
    },
    getUsageTrends: {
      storeRoles: [StoreRoles.ADMIN],
      requireAuthenticated: true,
    },

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
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: CreateAiLogDto,
    @Req() req: Request
  ) {
    try {
      const user = req.user as any;

      const log = await this.logsService.record({
        userId: dto.userId || user.id,
        storeId: storeId ?? dto.storeId,
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
    @Param('storeId') storeId: string,
    @Query() query: LogQueryDto,
    @Req() req: Request
  ) {
    try {
      // Apply security filters based on user permissions
      const filters = this.buildSecurityFilters(req, query, storeId);

      console.log(filters, query);

      const logs = await this.logsService.findByFilter({
        ...filters,
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
            userId: filters.userId,
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
  async getUsageStats(
    @Param('storeId') storeId: string,
    @Query() query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const filters = this.buildSecurityFilters(req, query, storeId);

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
            userId: filters.userId,
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
  async getTopFeatures(
    @Param('storeId') storeId: string,
    @Query() query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const filters = this.buildSecurityFilters(req, query, storeId);

      const topFeatures = await this.logsService.getTopFeatures(query.limit, {
        ...filters,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      return {
        success: true,
        data: {
          features: topFeatures,
          metadata: {
            limit: query.limit,
            generatedAt: new Date().toISOString(),
            userId: filters.userId,
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
  async getDailyUsage(
    @Param('storeId') storeId: string,
    @Query() query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const filters = this.buildSecurityFilters(req, query, storeId);

      const dailyUsage = await this.logsService.getDailyUsage(
        query.days,
        filters
      );

      return {
        success: true,
        data: {
          dailyUsage,
          metadata: {
            days: query.days,
            generatedAt: new Date().toISOString(),
            userId: filters.userId,
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
  async getErrorLogs(
    @Param('storeId') storeId: string,
    @Query() query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const filters = this.buildSecurityFilters(req, query, storeId);

      const errorLogs = await this.logsService.getErrorLogs(query.limit, {
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
            limit: query.limit,
            generatedAt: new Date().toISOString(),
            userId: filters.userId,
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
  async getUsageTrends(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query() query: UsageStatsQueryDto,
    @Req() req: Request
  ) {
    try {
      const filters = this.buildSecurityFilters(req, query, storeId);

      const trends = await this.logsService.getUsageTrends(query.days, filters);

      return {
        success: true,
        data: {
          trends,
          metadata: {
            period: query.days,
            generatedAt: new Date().toISOString(),
            userId: filters.userId,
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
  async cleanupLogs(@Body() dto: CleanupLogsDto) {
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

  private extractUser(req: Request): { id: string; isSiteAdmin: boolean } {
    const user = (req as any).user;
    if (!user?.id) {
      throw new BadRequestException('User context not found');
    }
    return {
      id: user.id,
      isSiteAdmin: user.isSiteAdmin,
    };
  }

  private buildSecurityFilters(
    req: Request,
    query: UsageStatsQueryDto,
    storeId?: string
  ) {
    const filters: any = {};

    const user = this.extractUser(req);

    // If user is not admin, restrict to their data
    if (!user.isSiteAdmin) {
      if (query.storeId || storeId) {
        filters.storeId = query.storeId ?? storeId;
      } else {
        filters.userId = user.id;
      }
    } else {
      // Admins can filter by specific store/user if provided
      if (query.storeId || storeId) filters.storeId = query.storeId ?? storeId;
      if (query.userId) filters.userId = query.userId;
    }

    return filters;
  }
}
