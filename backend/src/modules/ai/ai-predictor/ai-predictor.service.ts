import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { subDays } from 'date-fns';
import { BaseAiService } from 'src/common/abstracts/ai/base.ai.service';
import { AiPredictorRepository } from './ai-predictor.repository';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { AiLogsService } from '../ai-logs/ai-logs.service';
import { AiAuditService } from '../ai-audit/ai-audit.service';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import { AiPredictRow, AiPredictBatchRequest } from './dto/ai-predict.dto';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';
import {
  PredictorRequestData,
  PredictorResponseData,
} from 'src/common/interfaces/ai/predictor.interface';
import {
  IReviewsRepository,
  REVIEWS_REPOSITORY,
} from 'src/common/contracts/reviews.contract';

export interface FeatureVector {
  sales_7d: number;
  sales_14d: number;
  sales_30d: number;
  sales_7d_per_day: number;
  sales_30d_per_day: number;
  sales_ratio_7_30: number;
  views_7d: number;
  views_30d: number;
  addToCarts_7d: number;
  view_to_purchase_7d: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  avg_rating: number;
  rating_count: number;
  inventory_qty: number;
  days_since_restock: number;
  day_of_week: number;
  is_weekend: number;
  store_views_7d: number;
  store_purchases_7d: number;
}

/**
 * AiPredictorService extending BaseAiService
 *
 * Provides comprehensive prediction capabilities with:
 * - Feature vector building with caching
 * - Batch processing with chunking
 * - Error handling and retry logic
 * - Comprehensive logging and auditing
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
    private readonly predictorRepo: AiPredictorRepository,
    private readonly dataSource: DataSource,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly aiLogsService: AiLogsService,
    private readonly aiAuditService: AiAuditService,
    @Inject(REVIEWS_REPOSITORY) private readonly reviewsRepo: IReviewsRepository
  ) {
    super();

    this.predictorUrl =
      process.env.PREDICTOR_URL ?? 'http://predictor:8080/predict_batch';
    this.authToken = process.env.PREDICTOR_AUTH_TOKEN;
    this.chunkSize = parseInt(process.env.PREDICTOR_CHUNK_SIZE ?? '50');
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
      if (typeof item === 'string') continue; // productId string is valid

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
          totalTokens: 0, // Predictor doesn't use tokens
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

      // Cache the result
      this.featureCache.set(cacheKey, {
        features,
        timestamp: Date.now(),
      });

      // Clean up old cache entries periodically
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
   * Internal batch prediction logic (extracted from original predictBatch)
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

    // Normalize items to AiPredictRow format
    const normalized = await this.normalizeItems(items);

    // Build missing feature vectors in parallel chunks
    await this.buildMissingFeatures(normalized);

    // Process predictions in chunks
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

      // Process in smaller batches to avoid overwhelming the system
      if (featureBuildingPromises.length >= 10) {
        await Promise.allSettled(featureBuildingPromises);
        featureBuildingPromises.length = 0;
      }
    }

    // Process remaining promises
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
        // Handle chunk failure by marking all items as errors
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
    const payload: AiPredictBatchRequest = {
      rows: chunk.map((item) => ({
        productId: item.productId,
        storeId: item.storeId,
        features: item.features,
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

    const predictions = response.data?.results || [];

    // Store successful API call for auditing
    await this.storeChunkResult(chunk, response, userId, contextStoreId);

    return this.formatChunkResults(chunk, predictions, startIndex);
  }

  private formatChunkResults(
    chunk: Array<AiPredictRow & { meta: any }>,
    predictions: any[],
    startIndex: number
  ) {
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
  ) {
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
    // This matches the original storeResult method
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

  /* eslint-disable camelcase */
  private async computeFeatureVector(
    productId: string,
    storeId?: string
  ): Promise<FeatureVector> {
    // Date calculations
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    const start7 = formatDate(subDays(today, 6));
    const start14 = formatDate(subDays(today, 13));
    const start30 = formatDate(subDays(today, 29));
    const end = formatDate(today);

    // Parallel data fetching for performance
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
    const salesRatio7_30 = sales30 > 0 ? sales7 / sales30 : 0;
    const viewToPurchase7 = views7 > 0 ? sales7 / views7 : 0;

    // Store metrics (default to 0 if no store provided)
    const storeViews7 = storeAgg7?.views || 0;
    const storePurchases7 = storeAgg7?.purchases || 0;

    // Temporal features
    const dow = today.getUTCDay();
    const isWeekend = dow === 0 || dow === 6 ? 1 : 0;

    const features: FeatureVector = {
      sales_7d: sales7,
      sales_14d: sales14,
      sales_30d: sales30,
      sales_7d_per_day: Number(sales7PerDay.toFixed(6)),
      sales_30d_per_day: Number(sales30PerDay.toFixed(6)),
      sales_ratio_7_30: Number(salesRatio7_30.toFixed(6)),
      views_7d: views7,
      views_30d: views30,
      addToCarts_7d: addToCarts7,
      view_to_purchase_7d: Number(viewToPurchase7.toFixed(6)),
      avg_price: priceStats.avg || 0,
      min_price: priceStats.min || 0,
      max_price: priceStats.max || 0,
      avg_rating: ratingAgg?.avg || 0,
      rating_count: ratingAgg?.count || 0,
      inventory_qty: inventoryStats.quantity || 0,
      days_since_restock: inventoryStats.daysSinceRestock || 365,
      day_of_week: dow,
      is_weekend: isWeekend,
      store_views_7d: storeViews7,
      store_purchases_7d: storePurchases7,
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
    const variantRepo = this.dataSource.getRepository(ProductVariant);

    const priceRaw = await variantRepo
      .createQueryBuilder('v')
      .select('AVG(v.price)::numeric', 'avg_price')
      .addSelect('MIN(v.price)::numeric', 'min_price')
      .addSelect('MAX(v.price)::numeric', 'max_price')
      .where('v.product = :productId', { productId })
      .getRawOne();

    const avg = priceRaw?.avg_price ? Number(priceRaw.avg_price) : 0;
    const min = priceRaw?.min_price ? Number(priceRaw.min_price) : avg;
    const max = priceRaw?.max_price ? Number(priceRaw.max_price) : avg;

    return { avg, min, max };
  }

  private async getInventoryStats(productId: string) {
    const invRepo = this.dataSource.getRepository(Inventory);

    const invRaw = await invRepo
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.quantity),0)', 'inventory_qty')
      .addSelect('MAX(inv.updatedAt)::text', 'last_updated_at')
      .innerJoin('inv.variant', 'v')
      .where('v.product = :productId', { productId })
      .getRawOne();

    const quantity = invRaw ? Number(invRaw.inventory_qty || 0) : 0;
    const lastRestockAt = invRaw?.last_updated_at
      ? new Date(invRaw.last_updated_at)
      : null;

    const daysSinceRestock = lastRestockAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - lastRestockAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 365;

    return { quantity, daysSinceRestock };
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

  /**
   * Public method that maintains the original interface
   */
  async predictBatch(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ) {
    if (!items || !items.length) return [];
    const request: AiServiceRequest<PredictorRequestData> = {
      feature: 'batch_prediction',
      provider: 'predictor',
      data: { items },
    };

    const response = await this.execute(request);
    return response.result?.predictions || [];
  }

  /**
   * Enhanced prediction with persistence
   */
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

  /**
   * Get trending products based on recent predictions
   */
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

  /**
   * Get prediction statistics
   */
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

  /**
   * Health check for predictor service
   */
  async healthCheck() {
    try {
      // Test a simple prediction to verify service availability
      const testPayload = {
        rows: [
          {
            productId: 'test',
            features: { test: 1 },
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
