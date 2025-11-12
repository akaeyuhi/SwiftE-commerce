import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  PredictionQueryDto,
  TrendingQueryDto,
} from 'src/modules/ai/ai-predictor/dto/predictor-request.dto';
import { AiTransform } from 'src/modules/ai/decorators/ai-transform.decorator';
import { BadRequestException } from '@nestjs/common';
import { AiPredictorStatsService } from 'src/modules/ai/ai-predictor/services/ai-predictor-stats.service';

@Controller('stores/:storesId/ai/predictor/stats')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
@AiTransform()
export class AiPredictorStatsController {
  static accessPolicies: AccessPolicies = {
    getTrendingProducts: { storeRoles: [StoreRoles.ADMIN] },
    getPredictionStats: { storeRoles: [StoreRoles.ADMIN] },
    getModelComparison: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly statsService: AiPredictorStatsService) {}

  @Get('trending')
  async getTrendingProducts(
    @Param('storesId', ParseUUIDPipe)
    storeId: string,
    @Query(ValidationPipe)
    query: TrendingQueryDto,
    @Req()
    req: Request
  ) {
    const user = this.extractUser(req);

    const trending = await this.statsService.getTrendingProducts(storeId, {
      limit: query.limit || 10,
      timeframe: query.timeframe || 'week',
      minScore: query.minScore || 0.6,
    });

    return {
      success: true,
      data: {
        storeId,
        trending,
        metadata: {
          timeframe: query.timeframe || 'week',
          minScore: query.minScore || 0.6,
          generatedAt: new Date().toISOString(),
          userId: user.id,
        },
      },
    };
  }

  @Get('/')
  async getPredictionStats(
    @Param('storesId', ParseUUIDPipe)
    storeId: string,
    @Query(ValidationPipe)
    query: PredictionQueryDto,
    @Req()
    req: Request
  ) {
    const user = this.extractUser(req);

    const stats = await this.statsService.getPredictionStats({
      storeId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      modelVersion: query.modelVersion,
    });

    return {
      success: true,
      data: {
        storeId,
        stats,
        metadata: {
          period: {
            from: query.dateFrom,
            to: query.dateTo,
          },
          generatedAt: new Date().toISOString(),
          userId: user.id,
        },
      },
    };
  }

  @Get('models/comparison')
  @AdminRole(AdminRoles.ADMIN)
  @Get('models/comparison')
  async getModelComparison(
    @Query('modelA') modelA: string,
    @Query('modelB') modelB: string
  ) {
    if (!modelA || !modelB) {
      throw new BadRequestException('Both modelA and modelB are required');
    }

    const comparison = await this.statsService.getModelComparison(
      modelA,
      modelB
    );

    return {
      success: true,
      data: comparison,
    };
  }

  private extractUser(req: Request): {
    id: string;
    storeId?: string;
  } {
    const user = (req as any).user;
    if (!user?.id) {
      throw new BadRequestException('User context not found');
    }
    return {
      id: user.id,
      storeId: user.storeId,
    };
  }
}
