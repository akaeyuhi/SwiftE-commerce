import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AiPredictorService } from './ai-predictor.service';
import { AiPredictRow } from './dto/ai-predict.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { StoreRole } from 'src/common/decorators/store-role.decorator';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

/**
 * AiPredictorController
 *
 * Routes:
 *  - GET  /predictor/feature/:productId?storeId=...         -> builds and returns features
 *  - POST /predictor/predict                                -> predict single item (id or row)
 *  - POST /predictor/predict/batch                          -> predict many; persist optional
 *
 * Controller guarded by JwtAuthGuard + AdminGuard by default (adjust as needed).
 */
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
@StoreRole(StoreRoles.ADMIN, StoreRoles.MODERATOR)
@Controller('ai-predictor')
export class AiPredictorController {
  constructor(private readonly predictor: AiPredictorService) {}

  /**
   * Build feature vector (no prediction).
   */
  @Get('feature/:productId')
  async feature(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('storeId') storeId?: string
  ) {
    const features = await this.predictor.buildFeatureVector(
      productId,
      storeId
    );
    return { productId, storeId: storeId ?? null, features };
  }

  /**
   * Predict a single item. Body can be:
   *  - a string productId
   *  - an object { productId, storeId? }
   *  - a full PredictRow { productId?, storeId?, features? }
   *
   * This endpoint uses predictBatch under the hood for consistency.
   */
  @Post('predict')
  async predict(@Body() payload: any) {
    if (!payload) throw new BadRequestException('Empty body');

    let items: any[];
    if (typeof payload === 'string') items = [payload];
    else if (
      payload.productId &&
      Object.keys(payload).length <= 2 &&
      !payload.features
    ) {
      // object like { productId, storeId? }
      items = [{ productId: payload.productId, storeId: payload.storeId }];
    } else if (payload.features || payload.productId) {
      items = [payload as AiPredictRow];
    } else {
      // fallback - attempt to treat as single row
      items = [payload];
    }

    const results = await this.predictor.predictBatch(items);
    return results[0] ?? null;
  }

  /**
   * Batch predict endpoint.
   *
   * Body: { items: Array<string | {productId,storeId?} | PredictRow>, persist?: boolean, modelVersion?: string }
   *
   * If persist = true the predictions are persisted to DB and the response returns persisted IDs.
   */
  @Post('predict/batch')
  async predictBatch(
    @Body()
    body: {
      items: Array<
        string | { productId: string; storeId?: string } | AiPredictRow
      >;
      persist?: boolean;
      modelVersion?: string;
    }
  ) {
    const { items, persist, modelVersion } = body ?? {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { results: [] };
    }

    if (persist) {
      const persisted = await this.predictor.predictBatchAndPersist(
        items,
        modelVersion
      );
      return {
        results: persisted.map((p) => ({
          predictorStatId: p.predictorStat?.id,
          prediction: p.prediction,
        })),
      };
    } else {
      const results = await this.predictor.predictBatch(items);
      return { results };
    }
  }
}
