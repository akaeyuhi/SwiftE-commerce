import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { subDays } from 'date-fns';
import { BaseAiService } from 'src/common/abstracts/ai/base.ai.service';
import { AiPredictorRepository } from './ai-predictor.repository';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { AiLogsService } from '../ai-logs/ai-logs.service';
import { AiAuditService } from '../ai-audit/ai-audit.service';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import { AiPredictRow, AiPredictBatchRequest } from './dto/ai-predict.dto';
import { CaseTransformer } from 'src/common/utils/case-transformer.util';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';
import {
  PredictorRequestData,
  PredictorResponseData,
} from 'src/common/interfaces/ai/predictor.interface';
import { IReviewsRepository } from 'src/common/contracts/reviews.contract';
import { ConfigService } from '@nestjs/config';
import {
  ChunkResult,
  ErrorResult,
  FeatureVector,
} from 'src/modules/ai/ai-predictor/types';
import {
  IInventoryService,
  IVariantService,
} from 'src/common/contracts/ai-predictor.contract';

/**
 * AiPredictorService with CamelCase Conventions
 *
 * Features:
 * - Automatic snake_case ↔ camelCase transformation
 * - Feature vector caching (5-minute TTL)
 * - Batch processing with chunking
 * - Comprehensive error handling
 * - Performance optimization
 */
@Injectable()
export class AiPredictorService extends BaseAiService<
  PredictorRequestData,
  PredictorResponseData
> {
  private readonly predictorUrl: string;
  private readonly authToken?: string;
  private readonly chunkSize: number;

  // Feature cache to avoid rebuilding features for same product/store combination
  private readonly featureCache = new Map<
    string,
    {
      features: FeatureVector;
      timestamp: number;
    }
  >();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly predictorRepo: AiPredictorRepository,
    private readonly aiLogsService: AiLogsService,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly aiAuditService: AiAuditService,
    @Inject(IReviewsRepository)
    private readonly reviewsRepo: IReviewsRepository,
    @Inject(IVariantService) private readonly variantService: IVariantService,
    @Inject(IInventoryService)
    private readonly inventoryService: IInventoryService
  ) {
    super();

    this.predictorUrl = this.configService.get<string>(
      'PREDICTOR_URL',
      'http://predictor:8080'
    );
    this.authToken = this.configService.get<string>('PREDICTOR_AUTH_TOKEN');
    this.chunkSize = parseInt(
      this.configService.get<string>('PREDICTOR_CHUNK_SIZE') ?? '50'
    );
  }

  protected validateRequest(
    request: AiServiceRequest<PredictorRequestData>
  ): void {
    if (!request.data?.items?.length) {
      throw new Error('Items array is required and cannot be empty');
    }

    if (request.data.items.length > 1000) {
      throw new Error(
        'Cannot process more than 1000 items in a single request'
      );
    }

    for (const item of request.data.items) {
      if (typeof item === 'string') continue;

      if (typeof item === 'object') {
        const obj = item as any;
        if (!obj.productId && !obj.features) {
          throw new Error(
            'Each item must have either productId or pre-built features'
          );
        }
      }
    }
  }

  protected async processRequest(
    request: AiServiceRequest<PredictorRequestData>
  ): Promise<AiServiceResponse<PredictorResponseData>> {
    const startTime = Date.now();

    try {
      const predictions = await this.predictBatchInternal(
        request.data.items,
        request.data.modelVersion,
        request.userId,
        request.storeId
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        text: `Processed ${predictions.length} predictions`,
        result: {
          predictions,
          modelVersion: request.data.modelVersion,
          processingTime,
        },
        feature: request.feature,
        provider: 'predictor',
        model: request.data.modelVersion,
        usage: {
          totalTokens: 0,
        },
      };
    } catch (error) {
      this.logger.error('Predictor request processing failed:', error);
      throw error;
    }
  }

  protected async logUsage(
    request: AiServiceRequest<PredictorRequestData>,
    response: AiServiceResponse<PredictorResponseData>
  ): Promise<void> {
    await this.aiLogsService.record({
      userId: request.userId,
      storeId: request.storeId,
      feature: request.feature,
      prompt: null,
      details: {
        itemCount: request.data.items.length,
        modelVersion: request.data.modelVersion,
        processingTime: response.result?.processingTime,
        success: response.success,
        error: response.error,
        predictionsCount: response.result?.predictions?.length || 0,
      },
    });
  }

  protected async auditRequest(
    request: AiServiceRequest<PredictorRequestData>,
    response: AiServiceResponse<PredictorResponseData>
  ): Promise<void> {
    await this.aiAuditService.storeEncryptedResponse({
      feature: request.feature,
      provider: 'predictor',
      model: request.data.modelVersion,
      rawResponse: response.result,
      userId: request.userId,
      storeId: request.storeId,
    });
  }

  /**
   * Build comprehensive feature vector for a product with caching
   * Returns features in camelCase format
   */
  async buildFeatureVector(
    productId: string,
    storeId?: string
  ): Promise<FeatureVector> {
    const cacheKey = `${productId}:${storeId || 'none'}`;
    const cached = this.featureCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.features;
    }

    try {
      const features = await this.computeFeatureVector(productId, storeId);

      this.featureCache.set(cacheKey, {
        features,
        timestamp: Date.now(),
      });

      if (this.featureCache.size > 1000) {
        this.cleanupFeatureCache();
      }

      return features;
    } catch (error) {
      this.logger.error(
        `Failed to build feature vector for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Internal batch prediction with automatic case transformation
   */
  private async predictBatchInternal(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ) {
    if (!items || items.length === 0) return [];

    const normalized = await this.normalizeItems(items);
    await this.buildMissingFeatures(normalized);

    return this.processPredictionChunks(
      normalized,
      modelVersion,
      userId,
      contextStoreId
    );
  }

  private async normalizeItems(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ): Promise<
    Array<AiPredictRow & { meta: { productId?: string; storeId?: string } }>
  > {
    const normalized: Array<AiPredictRow & { meta: any }> = [];

    for (const item of items) {
      if (typeof item === 'string') {
        normalized.push({
          productId: item,
          storeId: undefined,
          features: {} as any,
          meta: { productId: item, storeId: undefined },
        });
      } else if (this.hasValidFeatures(item as AiPredictRow)) {
        const row = item as AiPredictRow;
        normalized.push({
          ...row,
          meta: { productId: row.productId, storeId: row.storeId },
        });
      } else {
        const obj = item as { productId: string; storeId?: string };
        normalized.push({
          productId: obj.productId,
          storeId: obj.storeId,
          features: {} as any,
          meta: { productId: obj.productId, storeId: obj.storeId },
        });
      }
    }

    return normalized;
  }

  private hasValidFeatures(row: AiPredictRow): boolean {
    return row.features && Object.keys(row.features).length > 0;
  }

  private async buildMissingFeatures(
    normalized: Array<AiPredictRow & { meta: any }>
  ): Promise<void> {
    const featureBuildingPromises: Promise<void>[] = [];

    for (const item of normalized) {
      if (this.hasValidFeatures(item)) continue;

      const promise = this.buildSingleItemFeatures(item);
      featureBuildingPromises.push(promise);

      if (featureBuildingPromises.length >= 10) {
        await Promise.allSettled(featureBuildingPromises);
        featureBuildingPromises.length = 0;
      }
    }

    if (featureBuildingPromises.length > 0) {
      await Promise.allSettled(featureBuildingPromises);
    }
  }

  private async buildSingleItemFeatures(
    item: AiPredictRow & { meta: any }
  ): Promise<void> {
    if (!item.productId) {
      item.features = {} as any;
      (item as any).__buildError = 'missing_product_id';
      return;
    }

    try {
      const features = await this.buildFeatureVector(
        item.productId,
        item.storeId
      );
      item.features = features as any;
    } catch (error) {
      item.features = {} as any;
      (item as any).__buildError = error.message || String(error);
      this.logger.warn(
        `buildFeatureVector failed for ${item.productId}: ${error.message || error}`
      );
    }
  }

  private async processPredictionChunks(
    normalized: Array<AiPredictRow & { meta: any }>,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ) {
    const results: Array<any> = [];

    for (let i = 0; i < normalized.length; i += this.chunkSize) {
      const chunk = normalized.slice(i, i + this.chunkSize);

      try {
        const chunkResults = await this.processSingleChunk(
          chunk,
          i,
          modelVersion,
          userId,
          contextStoreId
        );
        results.push(...chunkResults);
      } catch (error) {
        const errorResults = this.createErrorResults(chunk, i, error.message);
        results.push(...errorResults);
      }
    }

    return results;
  }

  private async processSingleChunk(
    chunk: Array<AiPredictRow & { meta: any }>,
    startIndex: number,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ) {
    // Transform features to snake_case for predictor API
    const payload: AiPredictBatchRequest = {
      rows: chunk.map((item) => ({
        productId: item.productId,
        storeId: item.storeId,
        features: CaseTransformer.transformKeysToSnake(item.features),
      })),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['X-Internal-Token'] = this.authToken;
    }

    const response = await lastValueFrom(
      this.httpService.post<{ results: any[] }>(this.predictorUrl, payload, {
        headers,
        timeout: this.requestTimeout,
      })
    );

    // Transform response back to camelCase
    const transformedData = CaseTransformer.transformKeysToCamel(response.data);
    const predictions = transformedData?.results || [];

    await this.storeChunkResult(chunk, response, userId, contextStoreId);

    return this.formatChunkResults(chunk, predictions, startIndex);
  }

  private formatChunkResults(
    chunk: Array<AiPredictRow & { meta: any }>,
    predictions: any[],
    startIndex: number
  ): Array<ChunkResult | ErrorResult> {
    return chunk.map((item, chunkIndex) => {
      const globalIndex = startIndex + chunkIndex;
      const buildError = (item as any).__buildError;

      if (buildError) {
        return {
          index: globalIndex,
          score: NaN,
          label: 'error',
          productId: item.meta.productId,
          storeId: item.meta.storeId,
          features: item.features,
          rawPrediction: null,
          error: `feature_build_error: ${buildError}`,
        };
      }

      const prediction = predictions[chunkIndex];
      if (!prediction) {
        return {
          index: globalIndex,
          score: NaN,
          label: 'no_prediction',
          productId: item.meta.productId,
          storeId: item.meta.storeId,
          features: item.features,
          rawPrediction: null,
          error: 'no_prediction_returned',
        };
      }

      const score = this.normalizeScore(
        prediction.score ?? prediction.probability ?? prediction.value ?? 0
      );

      const label =
        prediction.label ??
        (score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low');

      return {
        index: globalIndex,
        score,
        label,
        productId: item.meta.productId,
        storeId: item.meta.storeId,
        features: item.features,
        rawPrediction: prediction,
      };
    });
  }

  private createErrorResults(
    chunk: Array<AiPredictRow & { meta: any }>,
    startIndex: number,
    errorMessage: string
  ): ErrorResult[] {
    return chunk.map((item, chunkIndex) => ({
      index: startIndex + chunkIndex,
      score: NaN,
      label: 'error',
      productId: item.meta.productId,
      storeId: item.meta.storeId,
      features: item.features,
      rawPrediction: null,
      error: `predictor_call_error: ${errorMessage}`,
    }));
  }

  private normalizeScore(score: any): number {
    const numScore = Number(score);
    if (!Number.isFinite(numScore)) return 0;
    return Math.max(0, Math.min(1, numScore));
  }

  private async storeChunkResult(
    chunk: AiPredictRow[],
    response: any,
    userId?: string,
    storeId?: string
  ): Promise<void> {
    try {
      await this.aiLogsService.record({
        userId,
        storeId,
        feature: 'predictor',
        prompt: null,
        details: {
          requestRowsCount: chunk.length,
          requestSample: chunk[0] ? { productId: chunk[0].productId } : null,
        },
      });
    } catch (err) {
      this.logger.warn(
        'AiLogs.record failed for predictor: ' + (err as any)?.message
      );
    }

    try {
      await this.aiAuditService.storeEncryptedResponse({
        feature: 'predictor',
        provider: 'predictor',
        model: undefined,
        rawResponse: response.data,
        userId: userId || null,
        storeId: storeId || null,
      });
    } catch (err) {
      this.logger.warn(
        'AiAudit.storeEncryptedResponse failed for predictor: ' +
          (err as any)?.message
      );
    }
  }

  /**
   * Compute feature vector in camelCase format
   */
  private async computeFeatureVector(
    productId: string,
    storeId?: string
  ): Promise<FeatureVector> {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    const start7 = formatDate(subDays(today, 6));
    const start14 = formatDate(subDays(today, 13));
    const start30 = formatDate(subDays(today, 29));
    const end = formatDate(today);

    // Parallel data fetching
    const [
      agg7,
      agg14,
      agg30,
      storeAgg7,
      priceStats,
      ratingAgg,
      inventoryStats,
    ] = await Promise.all([
      this.productStatsRepo.getAggregatedMetrics(productId, {
        from: start7,
        to: end,
      }),
      this.productStatsRepo.getAggregatedMetrics(productId, {
        from: start14,
        to: end,
      }),
      this.productStatsRepo.getAggregatedMetrics(productId, {
        from: start30,
        to: end,
      }),
      storeId
        ? this.storeStatsRepo.getAggregatedMetrics(storeId, {
            from: start7,
            to: end,
          })
        : null,
      this.getPriceStats(productId),
      this.reviewsRepo.getRatingAggregate(productId),
      this.getInventoryStats(productId),
    ]);

    // Calculate derived metrics
    const sales7 = agg7.purchases || 0;
    const sales14 = agg14.purchases || 0;
    const sales30 = agg30.purchases || 0;
    const views7 = agg7.views || 0;
    const views30 = agg30.views || 0;
    const addToCarts7 = agg7.addToCarts || 0;

    const sales7PerDay = sales7 / 7;
    const sales30PerDay = sales30 / 30;
    const salesRatio7To30 = sales30 > 0 ? sales7 / sales30 : 0;
    const viewToPurchase7 = views7 > 0 ? sales7 / views7 : 0;

    const storeViews7 = storeAgg7?.views || 0;
    const storePurchases7 = storeAgg7?.purchases || 0;

    // Temporal features
    const dow = today.getUTCDay();
    const isWeekend = dow === 0 || dow === 6 ? 1 : 0;

    // Build feature vector in camelCase
    const features: FeatureVector = {
      sales7d: sales7,
      sales14d: sales14,
      sales30d: sales30,
      sales7dPerDay: Number(sales7PerDay.toFixed(6)),
      sales30dPerDay: Number(sales30PerDay.toFixed(6)),
      salesRatio7To30: Number(salesRatio7To30.toFixed(6)),
      views7d: views7,
      views30d: views30,
      addToCarts7d: addToCarts7,
      viewToPurchase7d: Number(viewToPurchase7.toFixed(6)),
      avgPrice: priceStats.avg || 0,
      minPrice: priceStats.min || 0,
      maxPrice: priceStats.max || 0,
      avgRating: ratingAgg?.avg || 0,
      ratingCount: ratingAgg?.count || 0,
      inventoryQty: inventoryStats.quantity || 0,
      daysSinceRestock: inventoryStats.daysSinceRestock || 365,
      dayOfWeek: dow,
      isWeekend,
      storeViews7d: storeViews7,
      storePurchases7d: storePurchases7,
    };

    // Ensure no NaN values
    Object.keys(features).forEach((key) => {
      const value = (features as any)[key];
      if (value === null || Number.isNaN(value)) {
        (features as any)[key] = 0;
      }
    });

    return features;
  }

  private async getPriceStats(productId: string) {
    return this.variantService.getPriceStats(productId);
  }

  private async getInventoryStats(productId: string) {
    return this.inventoryService.getInventoryStats(productId);
  }

  private cleanupFeatureCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.featureCache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.featureCache.delete(key));

    this.logger.debug(
      `Cleaned up ${keysToDelete.length} expired cache entries`
    );
  }

  // ===============================
  // Public API Methods
  // ===============================

  async predictBatch(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ) {
    if (!items || !items.length) return [];
    const request: AiServiceRequest<PredictorRequestData> = {
      feature: 'batchPrediction',
      provider: 'predictor',
      data: { items },
    };

    const response = await this.execute(request);
    return response.result?.predictions || [];
  }

  async predictBatchAndPersist(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string
  ): Promise<Array<{ predictorStat: AiPredictorStat; prediction: any }>> {
    const predictions = await this.predictBatch(items);
    const persisted: Array<{
      predictorStat: AiPredictorStat;
      prediction: any;
    }> = [];

    for (const prediction of predictions) {
      if (prediction.error) {
        this.logger.warn(
          `Skipping persist for product ${prediction.productId} due to error: ${prediction.error}`
        );
        continue;
      }

      try {
        const created = await this.predictorRepo.createEntity({
          scope: prediction.productId ? 'product' : 'store',
          productId: prediction.productId ?? null,
          storeId: prediction.storeId ?? null,
          features: prediction.features ?? {},
          prediction: prediction.rawPrediction ?? {
            score: prediction.score,
            label: prediction.label,
          },
          modelVersion: modelVersion ?? null,
        } as any);

        persisted.push({
          predictorStat: created as AiPredictorStat,
          prediction: prediction.rawPrediction ?? {
            score: prediction.score,
            label: prediction.label,
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to persist prediction for ${prediction.productId}: ${err?.message ?? err}`
        );
      }
    }

    return persisted;
  }

  async getTrendingProducts(
    storeId: string,
    options: {
      limit?: number;
      timeframe?: 'day' | 'week' | 'month';
      minScore?: number;
    } = {}
  ) {
    return this.predictorRepo.getTrendingProducts(storeId, options);
  }

  async getPredictionStats(
    filters: {
      storeId?: string;
      productId?: string;
      modelVersion?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    return this.predictorRepo.getPredictionStats(filters);
  }

  async healthCheck() {
    try {
      const testPayload = {
        rows: [
          {
            productId: 'test',
            features: CaseTransformer.transformKeysToSnake({ test: 1 }),
          },
        ],
      };

      const response = await lastValueFrom(
        this.httpService.post(this.predictorUrl, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { 'X-Internal-Token': this.authToken }),
          },
          timeout: 5000,
        })
      );

      return {
        healthy: true,
        url: this.predictorUrl,
        responseTime: Date.now(),
        status: response.status,
      };
    } catch (error) {
      return {
        healthy: false,
        url: this.predictorUrl,
        error: error.message,
      };
    }
  }
}
