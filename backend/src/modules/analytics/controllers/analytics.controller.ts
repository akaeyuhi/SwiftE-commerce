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
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AnalyticsService } from '../analytics.service';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import {
  AggregationRequestDto,
  AnalyticsQueryDto,
  BatchEventsDto,
} from 'src/modules/analytics/dto';
import { AiTransform } from 'src/modules/ai/decorators/ai-transform.decorator';

/**
 * AnalyticsController with CamelCase Conventions
 *
 * Unified controller for all analytics operations including:
 * - Event tracking (store moderator+ access)
 * - Analytics queries (store admin access)
 * - Advanced aggregations (store admin access)
 * - Health and monitoring (site admin access)
 *
 * Features:
 * - Automatic snake_case ↔ camelCase transformation via @AiTransform()
 * - Role-based access control
 * - Comprehensive error handling
 * - Batch processing support
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
@AiTransform()
export class AnalyticsController {
  static accessPolicies: AccessPolicies = {
    // Event tracking - allow store roles
    recordEvent: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    recordEvents: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

    // Basic analytics - store admins
    getStoreAnalytics: { storeRoles: [StoreRoles.ADMIN] },
    getStoreConversion: { storeRoles: [StoreRoles.ADMIN] },
    getProductAnalytics: { storeRoles: [StoreRoles.ADMIN] },
    getProductConversion: { storeRoles: [StoreRoles.ADMIN] },
    getTopProducts: { storeRoles: [StoreRoles.ADMIN] },

    // Advanced analytics - store admins
    getFunnelAnalysis: { storeRoles: [StoreRoles.ADMIN] },
    getRevenueTrends: { storeRoles: [StoreRoles.ADMIN] },
    getCohortAnalysis: { storeRoles: [StoreRoles.ADMIN] },
    getUserJourney: { storeRoles: [StoreRoles.ADMIN] },
    getStoreComparison: { storeRoles: [StoreRoles.ADMIN] },
    getProductComparison: { storeRoles: [StoreRoles.ADMIN] },

    // Generic aggregation - store admins
    getAggregation: { storeRoles: [StoreRoles.ADMIN] },

    // System endpoints - site admins only
    getHealth: { adminRole: AdminRoles.ADMIN },
    getStats: { adminRole: AdminRoles.ADMIN },
    getSupportedAggregators: { storeRoles: [StoreRoles.ADMIN] },
    getAggregationSchema: { storeRoles: [StoreRoles.ADMIN] },
  };

  constructor(private readonly analyticsService: AnalyticsService) {}

  // ===============================
  // Event Tracking Endpoints
  // ===============================

  /**
   * POST /analytics/stores/:storeId/events
   * Record a single analytics event
   *
   * @example
   * POST /analytics/stores/123e4567-e89b-12d3-a456-426614174000/events
   * Body: { "eventType": "view", "productId": "...", "userId": "..." }
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

      return {
        success: true,
        message: 'Event tracked successfully',
        event: {
          storeId: dto.storeId,
          eventType: dto.eventType,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to track event: ${error.message}`);
    }
  }

  /**
   * POST /analytics/stores/:storeId/events/batch
   * Record multiple analytics events in batch
   *
   * @example
   * POST /analytics/stores/123e4567-e89b-12d3-a456-426614174000/events/batch
   * Body: { "events": [{ "eventType": "view", ... }, ...] }
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
        total: events.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to track events: ${error.message}`);
    }
  }

  // ===============================
  // Store Analytics Endpoints
  // ===============================

  /**
   * GET /analytics/stores/:storeId
   * Get comprehensive store analytics with optional timeseries
   *
   * @example
   * GET /analytics/stores/123.../  ?from=2025-01-01&to=2025-01-31&includeTimeseries=true
   */
  @Get('stores/:storeId')
  async getStoreAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('storeStats', {
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
   * Get store conversion metrics (views → purchases)
   */
  @Get('stores/:storeId/conversion')
  async getStoreConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('storeConversion', {
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
   * GET /analytics/stores/:storeId/products/top
   * Get top performing products by conversion rate
   */
  @Get('stores/:storeId/products/top')
  async getTopProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('topProductsByConversion', {
        storeId,
        from: query.from,
        to: query.to,
        limit: query.limit || 10,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top products: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/ratings
   * Get store-wide ratings summary
   */
  @Get('stores/:storeId/ratings')
  async getStoreRatings(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('storeRatingsSummary', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get store ratings: ${error.message}`
      );
    }
  }

  // ===============================
  // Product Analytics Endpoints
  // ===============================

  /**
   * GET /analytics/stores/:storeId/products/:productId
   * Get comprehensive product analytics with optional timeseries
   */
  @Get('stores/:storeId/products/:productId')
  async getProductAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('productStats', {
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
      return await this.analyticsService.aggregate('productConversion', {
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
   * GET /analytics/stores/:storeId/products/:productId/rating
   * Get product rating aggregate
   */
  @Get('stores/:storeId/products/:productId/rating')
  async getProductRating(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string
  ) {
    try {
      return await this.analyticsService.aggregate('productRating', {
        storeId,
        productId,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get product rating: ${error.message}`
      );
    }
  }

  // ===============================
  // Advanced Analytics Endpoints
  // ===============================

  /**
   * GET /analytics/stores/:storeId/funnel
   * Get conversion funnel analysis (View → Add to Cart → Purchase)
   */
  @Get('stores/:storeId/funnel')
  async getFunnelAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('funnelAnalysis', {
        storeId,
        productId: query.productId,
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
      return await this.analyticsService.aggregate('revenueTrends', {
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
   * GET /analytics/stores/:storeId/cohort-analysis
   * Get cohort analysis for user retention
   */
  @Get('stores/:storeId/cohort-analysis')
  async getCohortAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('cohortAnalysis', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get cohort analysis: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/user-journey
   * Get user journey and path analysis
   */
  @Get('stores/:storeId/user-journey')
  async getUserJourney(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('userJourney', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get user journey: ${error.message}`
      );
    }
  }

  // ===============================
  // Comparison Analytics Endpoints
  // ===============================

  /**
   * POST /analytics/stores/compare
   * Compare multiple stores
   *
   * @example
   * POST /analytics/stores/compare
   * Body: { "storeIds": ["id1", "id2"], "from": "2025-01-01", "to": "2025-01-31" }
   */
  @Post('stores/compare')
  async getStoreComparison(
    @Body(ValidationPipe)
    dto: {
      storeIds: string[];
      from?: string;
      to?: string;
    }
  ) {
    try {
      if (!dto.storeIds || dto.storeIds.length < 2) {
        throw new BadRequestException('At least 2 store IDs required');
      }

      if (dto.storeIds.length > 10) {
        throw new BadRequestException('Maximum 10 stores can be compared');
      }

      return await this.analyticsService.aggregate('storeComparison', {
        storeIds: dto.storeIds,
        from: dto.from,
        to: dto.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to compare stores: ${error.message}`
      );
    }
  }

  /**
   * POST /analytics/products/compare
   * Compare multiple products
   *
   * @example
   * POST /analytics/products/compare
   * Body: { "productIds": ["id1", "id2"], "from": "2025-01-01", "to": "2025-01-31" }
   */
  @Post('products/compare')
  async getProductComparison(
    @Body(ValidationPipe)
    dto: {
      productIds: string[];
      from?: string;
      to?: string;
    }
  ) {
    try {
      if (!dto.productIds || dto.productIds.length < 2) {
        throw new BadRequestException('At least 2 product IDs required');
      }

      if (dto.productIds.length > 20) {
        throw new BadRequestException('Maximum 20 products can be compared');
      }

      return await this.analyticsService.aggregate('productComparison', {
        productIds: dto.productIds,
        from: dto.from,
        to: dto.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to compare products: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/period-comparison
   * Compare current period with previous period
   */
  @Get('stores/:storeId/period-comparison')
  async getPeriodComparison(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('periodComparison', {
        storeId,
        productId: query.productId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to compare periods: ${error.message}`
      );
    }
  }

  // ===============================
  // Performance Analytics Endpoints
  // ===============================

  /**
   * GET /analytics/stores/top-performing
   * Get top performing stores
   */
  @Get('stores/top-performing')
  @AdminRole(AdminRoles.ADMIN)
  async getTopPerformingStores(
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('topPerformingStores', {
        limit: query.limit || 10,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top performing stores: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/top-performing-products
   * Get top performing products for a store
   */
  @Get('stores/:storeId/top-performing-products')
  async getTopPerformingProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('topPerformingProducts', {
        storeId,
        limit: query.limit || 10,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get top performing products: ${error.message}`
      );
    }
  }

  /**
   * GET /analytics/stores/:storeId/underperforming
   * Get underperforming analysis
   */
  @Get('stores/:storeId/underperforming')
  async getUnderperformingAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    try {
      return await this.analyticsService.aggregate('underperformingAnalysis', {
        storeId,
        from: query.from,
        to: query.to,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get underperforming analysis: ${error.message}`
      );
    }
  }

  // ===============================
  // Generic Aggregation Endpoint
  // ===============================

  /**
   * POST /analytics/aggregations
   * Generic aggregation endpoint for custom queries
   *
   * @example
   * POST /analytics/aggregations
   * Body: {
   *   "aggregatorName": "storeConversion",
   *   "options": { "storeId": "...", "from": "2025-01-01", "to": "2025-01-31" }
   * }
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
   * Get analytics service statistics and metrics
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
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /analytics/aggregators/:name/schema
   * Get schema/documentation for specific aggregation type
   *
   * @example
   * GET /analytics/aggregators/storeConversion/schema
   */
  @Get('aggregators/:name/schema')
  async getAggregationSchema(@Param('name') name: string) {
    const schema = this.analyticsService.getAggregationSchema(name);
    if (!schema) {
      throw new BadRequestException(
        `Unknown aggregator: ${name}. Use GET /analytics/aggregators to see available options.`
      );
    }
    return schema;
  }
}
