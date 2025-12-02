import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
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
 * - Quick stats from cached values (instant response)
 * - Detailed analytics queries (store admin access)
 * - Advanced aggregations and insights
 * - Leaderboards and rankings
 * - Health and monitoring (site admin access)
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
@AiTransform()
export class AnalyticsController {
  static accessPolicies: AccessPolicies = {
    // Event tracking
    recordEvent: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    recordEvents: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

    // Quick stats (cached)
    getProductQuickStats: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    getStoreQuickStats: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    getBatchProductStats: {
      adminRole: AdminRoles.ADMIN,
      /*storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],*/
    },

    // Detailed analytics
    getStoreAnalytics: { storeRoles: [StoreRoles.ADMIN] },
    getStoreConversion: { storeRoles: [StoreRoles.ADMIN] },
    getProductAnalytics: { storeRoles: [StoreRoles.ADMIN] },
    getProductConversion: { storeRoles: [StoreRoles.ADMIN] },
    getProductRating: { storeRoles: [StoreRoles.ADMIN] },
    getStoreRatings: { storeRoles: [StoreRoles.ADMIN] },
    getCategorySales: { storeRoles: [StoreRoles.ADMIN] },

    // Leaderboards
    getTopProductsByViews: { storeRoles: [StoreRoles.ADMIN] },
    getTopProductsByConversion: { storeRoles: [StoreRoles.ADMIN] },
    getTopProducts: { storeRoles: [StoreRoles.ADMIN] },

    // Advanced analytics
    getFunnelAnalysis: { storeRoles: [StoreRoles.ADMIN] },
    getRevenueTrends: { storeRoles: [StoreRoles.ADMIN] },
    getCohortAnalysis: { storeRoles: [StoreRoles.ADMIN] },
    getUserJourney: { storeRoles: [StoreRoles.ADMIN] },

    // Comparisons
    getStoreComparison: { adminRole: AdminRoles.ADMIN },
    getProductComparison: { adminRole: AdminRoles.ADMIN },
    getPeriodComparison: { storeRoles: [StoreRoles.ADMIN] },

    // Performance analytics
    getTopPerformingStores: { adminRole: AdminRoles.ADMIN },
    getTopStoresByRevenue: { adminRole: AdminRoles.ADMIN },
    getTopPerformingProducts: { storeRoles: [StoreRoles.ADMIN] },
    getUnderperformingAnalysis: { storeRoles: [StoreRoles.ADMIN] },

    // Data sync
    syncProductStats: { adminRole: AdminRoles.ADMIN },
    syncStoreStats: { adminRole: AdminRoles.ADMIN },

    // Generic
    getAggregation: { storeRoles: [StoreRoles.ADMIN] },

    // System
    getHealth: { adminRole: AdminRoles.ADMIN },
    getStats: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stores/top-performing')
  @AdminRole(AdminRoles.ADMIN)
  async getTopPerformingStores(
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('topPerformingStores', {
      limit: query.limit || 10,
      from: query.from,
      to: query.to,
    });
  }

  @Get('stores/top/revenue')
  @AdminRole(AdminRoles.ADMIN)
  async getTopStoresByRevenue(@Query(ValidationPipe) query: AnalyticsQueryDto) {
    return await this.analyticsService.getTopStoresByRevenue(query.limit || 10);
  }

  // ===============================
  // Event Tracking Endpoints
  // ===============================

  @Post('stores/:storeId/events')
  @HttpCode(HttpStatus.CREATED)
  async recordEvent(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: RecordEventDto
  ) {
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
  }

  @Post('stores/:storeId/events/batch')
  @HttpCode(HttpStatus.CREATED)
  async recordEvents(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body(ValidationPipe) dto: BatchEventsDto
  ) {
    const events = dto.events.map((event) => ({
      ...event,
      storeId: event.storeId ?? storeId,
    }));

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
  }

  // ===============================
  // Quick Stats (Cached - Instant Response)
  // ===============================

  @Get('stores/:storeId/quick-stats')
  async getStoreQuickStats(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return await this.analyticsService.getStoreQuickStats(storeId);
  }

  @Post('products/batch-stats')
  async getBatchProductStats(@Body() dto: { productIds: string[] }) {
    if (!dto.productIds || dto.productIds.length === 0) {
      throw new BadRequestException('productIds array is required');
    }
    if (dto.productIds.length > 100) {
      throw new BadRequestException(
        'Maximum 100 products can be queried at once'
      );
    }
    return await this.analyticsService.getBatchProductStats(dto.productIds);
  }

  // ===============================
  // Store Analytics Endpoints
  // ===============================

  @Get('stores/:storeId')
  async getStoreAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('storeStats', {
      storeId,
      from: query.from,
      to: query.to,
      includeTimeseries: query.includeTimeseries,
    });
  }

  @Get('stores/:storeId/conversion')
  async getStoreConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.computeStoreConversion(
      storeId,
      query.from,
      query.to
    );
  }

  @Get('stores/:storeId/ratings')
  async getStoreRatings(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('storeRatingsSummary', {
      storeId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('stores/:storeId/sales-by-category')
  async getCategorySales(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.getCategorySales(
      storeId,
      query.from,
      query.to
    );
  }

  @Get('stores/:storeId/products/top/views')
  async getTopProductsByViews(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.getTopProductsByViews(
      storeId,
      query.limit || 10
    );
  }

  @Get('stores/:storeId/products/top/conversion')
  async getTopProductsByConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.getTopProductsByConversionCached(
      storeId,
      query.limit || 10
    );
  }

  @Get('stores/:storeId/products/top')
  async getTopProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.getTopProductsByConversion(
      storeId,
      query.from,
      query.to,
      query.limit || 10
    );
  }

  // ===============================
  // Advanced Analytics Endpoints
  // ===============================

  @Get('stores/:storeId/funnel')
  async getFunnelAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('funnelAnalysis', {
      storeId,
      productId: query.productId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('stores/:storeId/revenue-trends')
  async getRevenueTrends(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('revenueTrends', {
      storeId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('stores/:storeId/cohort-analysis')
  async getCohortAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('cohortAnalysis', {
      storeId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('stores/:storeId/user-journey')
  async getUserJourney(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('userJourney', {
      storeId,
      from: query.from,
      to: query.to,
    });
  }

  // ===============================
  // Comparison Analytics Endpoints
  // ===============================

  @Post('stores/compare')
  async getStoreComparison(
    @Body(ValidationPipe)
    dto: {
      storeIds: string[];
      from?: string;
      to?: string;
    }
  ) {
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
  }

  @Post('products/compare')
  async getProductComparison(
    @Body(ValidationPipe)
    dto: {
      productIds: string[];
      from?: string;
      to?: string;
    }
  ) {
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
  }

  @Get('stores/:storeId/period-comparison')
  async getPeriodComparison(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('periodComparison', {
      storeId,
      productId: query.productId,
      from: query.from,
      to: query.to,
    });
  }

  // ===============================
  // Performance Analytics Endpoints
  // ===============================

  @Get('stores/:storeId/top-performing-products')
  async getTopPerformingProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('topPerformingProducts', {
      storeId,
      limit: query.limit || 10,
      from: query.from,
      to: query.to,
    });
  }

  @Get('stores/:storeId/underperforming')
  async getUnderperformingAnalysis(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('underperformingAnalysis', {
      storeId,
      from: query.from,
      to: query.to,
    });
  }

  // ===============================
  // Product Analytics Endpoints
  // ===============================

  @Get('stores/:storeId/products/:productId')
  async getProductAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.aggregate('productStats', {
      storeId,
      productId,
      from: query.from,
      to: query.to,
      includeTimeseries: query.includeTimeseries,
    });
  }

  @Get('stores/:storeId/products/:productId/conversion')
  async getProductConversion(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(ValidationPipe) query: AnalyticsQueryDto
  ) {
    return await this.analyticsService.computeProductConversion(
      productId,
      query.from,
      query.to
    );
  }

  @Get('stores/:storeId/products/:productId/rating')
  async getProductRating(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string
  ) {
    return await this.analyticsService.aggregate('productRating', {
      storeId,
      productId,
    });
  }

  @Get('products/:productId/quick-stats')
  async getProductQuickStats(
    @Param('productId', ParseUUIDPipe) productId: string
  ) {
    return await this.analyticsService.getProductQuickStats(productId);
  }

  // ===============================
  // Leaderboards & Rankings
  // ===============================

  // ===============================
  // Data Sync Endpoints (Admin Only)
  // ===============================

  @Post('sync/products/:productId')
  @AdminRole(AdminRoles.ADMIN)
  async syncProductStats(@Param('productId', ParseUUIDPipe) productId: string) {
    return await this.analyticsService.syncCachedStatsWithAnalytics(productId);
  }

  @Post('sync/stores/:storeId')
  @AdminRole(AdminRoles.ADMIN)
  async syncStoreStats(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return await this.analyticsService.syncCachedStatsWithAnalytics(
      undefined,
      storeId
    );
  }

  // ===============================
  // Generic Aggregation Endpoint
  // ===============================

  @Post('aggregations')
  @AdminRole(AdminRoles.ADMIN)
  async getAggregation(@Body(ValidationPipe) dto: AggregationRequestDto) {
    return await this.analyticsService.aggregate(
      dto.aggregatorName,
      dto.options
    );
  }

  // ===============================
  // System & Monitoring Endpoints
  // ===============================

  @Get('health')
  @AdminRole(AdminRoles.ADMIN)
  async getHealth() {
    return await this.analyticsService.healthCheck();
  }

  @Get('stats')
  @AdminRole(AdminRoles.ADMIN)
  async getStats() {
    return await this.analyticsService.getStats();
  }

  @Get('aggregators')
  async getSupportedAggregators() {
    const aggregators = this.analyticsService.getSupportedAggregators();
    return {
      aggregators,
      count: aggregators.length,
      timestamp: new Date().toISOString(),
    };
  }

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
