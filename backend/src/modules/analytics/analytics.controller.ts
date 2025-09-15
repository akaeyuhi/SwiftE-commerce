import {
  Controller,
  UseGuards,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { GetStatsDto } from './dto/get-stats.dto';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * StatsController
 *
 * Admin APIs to query aggregated metrics for a store or product.
 * Path: GET /stores/:storeId/analytics
 */
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
@Controller('stores/:storeId/analytics')
export class AnalyticsController {
  static accessPolicies: AccessPolicies = {
    getStoreStats: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
    getProductStats: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
    },
  };

  constructor(private readonly statsService: AnalyticsService) {}

  /**
   * GET /stores/:storeId/analytics
   * Query store stats for a range
   */
  @Get()
  async getStoreStats(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query() dto: GetStatsDto
  ) {
    return this.statsService.getStoreStats(storeId, dto.from, dto.to);
  }

  /**
   * GET /stores/:storeId/analytics/products/:productId
   */
  @Get('products/:productId')
  async getProductStats(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query() dto: GetStatsDto
  ) {
    return this.statsService.getProductStats(productId, dto.from, dto.to);
  }
}
