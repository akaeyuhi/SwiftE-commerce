import {
  Controller,
  UseGuards,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { GetStatsDto } from 'src/modules/analytics/dto/get-stats.dto';

@Controller('stores/:storeId/analytics')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class AdminStatsController {
  constructor(private readonly statsService: AnalyticsService) {}

  @Get('metrics/summary')
  async getStoreSummary(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query() q: GetStatsDto
  ) {
    return this.statsService.computeStoreConversion(storeId, q.from, q.to);
  }

  @Get('products/:productId/metrics')
  async getProductMetrics(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query() q: GetStatsDto
  ) {
    return this.statsService.computeProductConversion(productId, q.from, q.to);
  }

  @Get('products/top')
  async getTopProducts(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query() q: GetStatsDto & { limit?: string }
  ) {
    const limit = q['limit'] ? Number(q['limit']) : 10;
    return this.statsService.getTopProductsByConversion(
      storeId,
      q.from,
      q.to,
      limit
    );
  }

  /**
   * Save AI stat coming from an external model (UI or service).
   * Example body:
   * { scope: 'product', productId: '...', features: { ... }, prediction: { trend: 'up', score: 0.8 }, modelVersion: 'v1' }
   */
  @Post('ai-stats')
  async recordAiStat(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body()
    body: {
      scope: 'store' | 'product';
      productId?: string;
      features: Record<string, any>;
      prediction: Record<string, any>;
      modelVersion?: string;
    }
  ) {
    return this.statsService.recordAiStat({
      scope: body.scope,
      storeId,
      productId: body.productId,
      features: body.features,
      prediction: body.prediction,
      modelVersion: body.modelVersion,
    });
  }

  @Get('ai-stats')
  async listAiStats(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Query('limit') limit?: string
  ) {
    return this.statsService.getAiStatsForStore(
      storeId,
      limit ? Number(limit) : 50
    );
  }
}
