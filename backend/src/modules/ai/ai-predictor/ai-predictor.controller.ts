import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { AiPredictorService } from './ai-predictor.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { AdminRole } from 'src/common/decorators/admin-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  BatchPredictDto,
  BuildFeatureVectorDto,
  PredictionQueryDto,
  SinglePredictDto,
  TrendingQueryDto,
} from 'src/modules/ai/ai-predictor/dto/predictor-request.dto';

/**
 * AI Predictor Controller
 *
 * Provides comprehensive AI prediction endpoints with:
 * - Feature vector building and caching
 * - Single and batch predictions
 * - Trending analysis and insights
 * - Performance monitoring
 * - Health checks
 *
 * Security:
 * - Store admins can predict for their store products
 * - Site admins can predict for any products
 * - Entity owner guards for data access control
 */
@Controller('ai/predictor')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
export class AiPredictorController {
  static accessPolicies: AccessPolicies = {
    buildFeatureVector: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },

    predictSingle: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },
    predictBatch: { storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR] },

    getTrendingProducts: { storeRoles: [StoreRoles.ADMIN] },
    getPredictionStats: { storeRoles: [StoreRoles.ADMIN] },

    healthCheck: { adminRole: AdminRoles.ADMIN },
    getModelComparison: { adminRole: AdminRoles.ADMIN },
  };

  constructor(private readonly predictorService: AiPredictorService) {}

  /**
   * GET /ai/predictor/features/:productId
   * Build feature vector for a product
   */
  @Get('features/:productId')
  async buildFeatureVector(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(ValidationPipe) query: BuildFeatureVectorDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const features = await this.predictorService.buildFeatureVector(
        productId,
        query.storeId
      );

      return {
        success: true,
        data: {
          productId,
          storeId: query.storeId || null,
          features,
          metadata: {
            generatedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to build feature vector: ${error.message}`
      );
    }
  }

  /**
   * POST /ai/predictor/predict
   * Single item prediction
   */
  @Post('predict')
  @HttpCode(HttpStatus.OK)
  async predictSingle(
    @Body(ValidationPipe) dto: SinglePredictDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      let items: any[];

      if (dto.productId) {
        items = [
          {
            productId: dto.productId,
            storeId: dto.storeId,
            features: dto.features,
          },
        ];
      } else if (dto.features) {
        items = [
          {
            features: dto.features,
            storeId: dto.storeId,
          },
        ];
      } else {
        throw new BadRequestException(
          'Either productId or features must be provided'
        );
      }

      const results = await this.predictorService.predictBatch(items);
      const prediction = results[0];

      if (!prediction) {
        throw new NotFoundException('No prediction generated');
      }

      return {
        success: true,
        data: {
          prediction,
          metadata: {
            modelVersion: dto.modelVersion,
            processedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(`Prediction failed: ${error.message}`);
    }
  }

  /**
   * POST /ai/predictor/predict/batch
   * Batch predictions with optional persistence
   */
  @Post('predict/batch')
  @HttpCode(HttpStatus.OK)
  async predictBatch(
    @Body(ValidationPipe) dto: BatchPredictDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      if (!dto.items?.length) {
        return { success: true, data: { results: [], metadata: { count: 0 } } };
      }

      if (dto.items.length > 1000) {
        throw new BadRequestException(
          'Cannot process more than 1000 items in a single batch'
        );
      }

      let results;

      if (dto.persist) {
        // Persist predictions to database
        const persisted = await this.predictorService.predictBatchAndPersist(
          dto.items,
          dto.modelVersion
        );

        results = persisted.map((p) => ({
          predictorStatId: p.predictorStat?.id,
          prediction: p.prediction,
          success: true,
        }));
      } else {
        // Just return predictions without persistence
        results = await this.predictorService.predictBatch(dto.items);
      }

      return {
        success: true,
        data: {
          results,
          metadata: {
            totalItems: dto.items.length,
            processedItems: results.length,
            persisted: dto.persist || false,
            modelVersion: dto.modelVersion,
            processedAt: new Date().toISOString(),
            userId: user.id,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Batch prediction failed: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/predictor/stores/:storeId/trending
   * Get trending products for a store based on predictions
   */
  @Get('stores/:storeId/trending')
  async getTrendingProducts(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: TrendingQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const trending = await this.predictorService.getTrendingProducts(
        storeId,
        {
          limit: query.limit || 10,
          timeframe: query.timeframe || 'week',
          minScore: query.minScore || 0.6,
        }
      );

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
    } catch (error) {
      throw new BadRequestException(
        `Failed to get trending products: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/predictor/stores/:storeId/stats
   * Get prediction statistics for a store
   */
  @Get('stores/:storeId/stats')
  async getPredictionStats(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query(ValidationPipe) query: PredictionQueryDto,
    @Req() req: Request
  ) {
    try {
      const user = this.extractUser(req);

      const stats = await this.predictorService.getPredictionStats({
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
    } catch (error) {
      throw new BadRequestException(
        `Failed to get prediction stats: ${error.message}`
      );
    }
  }

  /**
   * GET /ai/predictor/health
   * Health check for predictor service
   */
  @Get('health')
  @AdminRole(AdminRoles.ADMIN)
  async healthCheck() {
    try {
      const health = await this.predictorService.healthCheck();

      return {
        success: true,
        data: {
          service: 'ai-predictor',
          ...health,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          service: 'ai-predictor',
          healthy: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * GET /ai/predictor/models/comparison
   * Compare performance of different model versions
   */
  @Get('models/comparison')
  @AdminRole(AdminRoles.ADMIN)
  async getModelComparison(@Query(ValidationPipe) query: PredictionQueryDto) {
    try {
      // This would be implemented in the repository
      const comparison = await this.predictorService.getPredictionStats({
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      return {
        success: true,
        data: {
          comparison,
          metadata: {
            period: {
              from: query.dateFrom,
              to: query.dateTo,
            },
            generatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get model comparison: ${error.message}`
      );
    }
  }

  private extractUser(req: Request): { id: string; storeId?: string } {
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
