// src/modules/analytics/controllers/analytics.controller.ts
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { AnalyticsService } from '../analytics.service';
import { RecordEventDto } from '../dto/record-event.dto';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import {AggregationRequestDto, AnalyticsQueryDto, BatchEventsDto} from "src/modules/analytics/dto";

/**
 * AnalyticsController
 *
 * Unified controller for all analytics operations including:
 * - Event tracking (public endpoints)
 * - Analytics queries (store admin access)
 * - Advanced aggregations (admin access)
 * - Health and monitoring (admin access)
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class AnalyticsController {
  static accessPolicies: AccessPolicies = {
    // Event tracking - allow store roles
    recordEvent: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    recordEvents: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

    // Basic analytics - store admins
    getStoreAnalytics: { storeRoles: [StoreRoles.ADMIN] },
    getProductAnalytics: { storeRoles: [StoreRoles.ADMIN] },

    // Advanced aggregations - site admins or store admins
    getAggregation: { storeRoles: [StoreRoles.ADMIN] },

    // System endpoints - site admins only
    getHealth: { adminRole: AdminRoles.ADMIN },
    getStats: { adminRole: AdminRoles.ADMIN },
    getSupportedAggregators: { storeRoles: [StoreRoles.ADMIN] },
  };

  constructor(private readonly analyticsService: AnalyticsService) {}

  // ===============================
  // Event Tracking Endpoints
  // ===============================

  /**
   * POST /analytics/stores/:storeId/events
   * Record a single analytics event
   */
  @Post('stores/:storeId/events')
  @HttpCode(HttpStatus.CREATED)
  async recordEvent(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: RecordEventDto
  ) {
    try {
      // Ensure storeId consistency
      dto.storeId = dto.storeId ?? storeId;

      if (dto.storeId !== storeId) {
        throw new BadRequestException(
          'StoreId in body must match route parameter'
        );
      }

      await this.analyticsService.trackEvent(dto);
      return { success: true, message: 'Event tracked successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to track event: ${error.message}`);
    }
  }

  /**
   * POST /analytics/stores/:storeId/events/batch
   * Record multiple analytics events in batch
   */
  @Post('stores/:storeId/events/batch')
  @HttpCode(HttpStatus.CREATED)
  async recordEvents(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: BatchEventsDto
  ) {
    try {
      // Validate and normalize events
      const events = dto.events.map((event) => ({
        ...event,
        storeId: event.storeId ?? storeId,
      }));

      // Validate all events belong to the same store
      const invalidEvents = events.filter((event) => event.storeId !== storeId);
      if (invalidEvents.length > 0) {
        throw new BadRequestException(
          'All events must belong to the specified store'
        );
      }

      const result = await this.analyticsService.batchTrack(events);
      return {
        success: true,
        processed: result.success,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to track events: ${error.message}`);
    }
  }

  // ===============================
  // Basic Analytics Endpoints
  // ===============================

  /**
   * GET /analytics/stores/:storeId
   * Get comprehensive store analytics
   */
  @Get('stores/:storeId')
  async getStoreAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('store_stats', {
        storeId,
        from: query.from,
        to: query.to,
        includeTimeseries: query.includeTimeseries,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get store analytics: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/conversion
   * Get store conversion metrics
   */
  @Get('stores/:storeId/conversion')
  async getStoreConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('store_conversion', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get conversion metrics: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/products/:productId
   * Get comprehensive product analytics
   */
  @Get('stores/:storeId/products/:productId')
  async getProductAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('product_stats', {
        storeId,
        productId,
        from: query.from,
        to: query.to,
        includeTimeseries: query.includeTimeseries,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get product analytics: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/products/:productId/conversion
   * Get product conversion metrics
   */
  @Get('stores/:storeId/products/:productId/conversion')
  async getProductConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('product_conversion', {
        storeId,
        productId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get product conversion: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/products/top
   * Get top performing products
   */
  @Get('stores/:storeId/products/top')
  async getTopProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate(
        'top_products_by_conversion',
        {
          storeId,
          from: query.from,
          to: query.to,
          limit: query.limit || 10,
        }
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top products: ${error.message}`
      );
    }
  }

  // ===============================
  // Advanced Analytics Endpoints
  // ===============================

  /**
   * GET /analytics/stores/:storeId/funnel
   * Get conversion funnel analysis
   */
  @Get('stores/:storeId/funnel')
  async getFunnelAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('funnel_analysis', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get funnel analysis: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/revenue-trends
   * Get revenue trends over time
   */
  @Get('stores/:storeId/revenue-trends')
  async getRevenueTrends(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('revenue_trends', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get revenue trends: ${error.message}`
      );
    }
  }

  /**
   * POST /analytics/aggregations
   * Generic aggregation endpoint for custom queries
   */
  @Post('aggregations')
  async getAggregation(@Body(ValidationPipe) dto: AggregationRequestDto) {
    try {
      return await this.analyticsService.aggregate(
        dto.aggregatorName,
        dto.options
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to run aggregation: ${error.message}`
      );
    }
  }

  // ===============================
  // System & Monitoring Endpoints
  // ===============================

  /**
   * GET /analytics/health
   * Get analytics service health status
   */
  @Get('health')
  @AdminRole(AdminRoles.ADMIN)
  async getHealth() {
    return await this.analyticsService.healthCheck();
  }

  /**
   * GET /analytics/stats
   * Get analytics service statistics
   */
  @Get('stats')
  @AdminRole(AdminRoles.ADMIN)
  async getStats() {
    return await this.analyticsService.getStats();
  }

  /**
   * GET /analytics/aggregators
   * Get list of supported aggregation types
   */
  @Get('aggregators')
  async getSupportedAggregators() {
    const aggregators = this.analyticsService.getSupportedAggregators();
    return {
      aggregators,
      count: aggregators.length,
    };
  }

  /**
   * GET /analytics/aggregators/:name/schema
   * Get schema for specific aggregation type
   */
  @Get('aggregators/:name/schema')
  async getAggregationSchema(@Param('name') name: string) {
    const schema = this.analyticsService.getAggregationSchema(name);
    if (!schema) {
      throw new BadRequestException(`Unknown aggregator: ${name}`);
    }
    return schema;
  }
}
