import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  BatchPredictDto,
  SinglePredictDto,
} from 'src/modules/ai/ai-predictor/dto/predictor-request.dto';
import { AiTransform } from 'src/modules/ai/decorators/ai-transform.decorator';

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
import { IAiPredictorService } from '../contracts/ai-predictor.service.contract';
import { Inject } from '@nestjs/common';

@Controller('stores/:storeId/ai/predictor')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard, EntityOwnerGuard)
@AiTransform()
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

  constructor(
    @Inject(IAiPredictorService)
    private readonly predictorService: IAiPredictorService
  ) {}

  // /**
  //  * GET /ai/predictor/features/:productId
  //  * Build feature vector for a product
  //  */
  // @Get('features/:productId')
  // async buildFeatureVector(
  //   @Param('productId', ParseUUIDPipe) productId: string,
  //   @Query(ValidationPipe) query: BuildFeatureVectorDto,
  //   @Req() req: Request
  // ) {
  //   const user = this.extractUser(req);
  //
  //   const features = await this.predictorService.buildFeatureVector(
  //     productId,
  //     query.storeId
  //   );
  //
  //   return {
  //     success: true,
  //     data: {
  //       productId,
  //       storeId: query.storeId || null,
  //       features,
  //       metadata: {
  //         generatedAt: new Date().toISOString(),
  //         userId: user.id,
  //       },
  //     },
  //   };
  // }

  /**
   * POST /ai/predictor/predict
   * Single item prediction
   */
  @Post('predict')
  @HttpCode(HttpStatus.OK)
  async predictSingle(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body(ValidationPipe) dto: SinglePredictDto,
    @Req() req: Request
  ) {
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
    } else items = [];

    const results = await this.predictorService.predict(
      items,
      user.id,
      storeId ?? dto.storeId
    );
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
  }

  /**
   * POST /ai/predictor/predict/batch
   * Batch predictions with optional persistence
   */
  @Post('predict/batch')
  @HttpCode(HttpStatus.OK)
  async predictBatch(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body(ValidationPipe)
    dto: BatchPredictDto,
    @Req()
    req: Request
  ) {
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
    let processedItems = 0;
    let errorsArray;

    if (dto.persist) {
      const [persisted, errors] =
        await this.predictorService.predictBatchAndPersist(
          dto.items,
          user.id,
          dto.modelVersion,
          storeId
        );
      results = persisted.map((p) => ({
        prediction: p.prediction,
        success: true,
      }));
      errorsArray = errors;
      processedItems = persisted.length;
    } else {
      results = await this.predictorService.predict(dto.items);
      processedItems = (results as any)?.results?.length || results.length || 0;
    }

    if (errorsArray.length) {
      throw new BadRequestException(
        errorsArray.map((error) => error.message).join(', ')
      );
    }

    return {
      success: true,
      data: {
        results,
        metadata: {
          totalItems: dto.items.length,
          processedItems,
          persisted: dto.persist || false,
          modelVersion: dto.modelVersion,
          processedAt: new Date().toISOString(),
          userId: user.id,
        },
      },
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
