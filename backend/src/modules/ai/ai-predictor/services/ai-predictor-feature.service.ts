import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiPredictRow } from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { ErrorResult, FeatureVector } from 'src/modules/ai/ai-predictor/types';
import { subDays } from 'date-fns';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { IReviewsRepository } from 'src/common/contracts/reviews.contract';
import {
  IInventoryService,
  IVariantService,
} from 'src/common/contracts/ai-predictor.contract';

@Injectable()
export class AiPredictorFeatureService {
  constructor(
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    @Inject(IReviewsRepository)
    private readonly reviewsRepo: IReviewsRepository,
    @Inject(IVariantService) private readonly variantService: IVariantService,
    @Inject(IInventoryService)
    private readonly inventoryService: IInventoryService
  ) {}

  protected readonly logger = new Logger(this.constructor.name);
  // Feature cache to avoid rebuilding features for same product/store combination
  private readonly featureCache = new Map<
    string,
    {
      features: FeatureVector;
      timestamp: number;
    }
  >();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

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

  public async preparePredictionItems(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ): Promise<
    Array<AiPredictRow & { meta: { productId?: string; storeId?: string } }>
  > {
    if (!items || items.length === 0) return [];

    const normalized = await this.normalizeItems(items);
    await this.buildMissingFeatures(normalized);
    return normalized;
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
      avgRating: ratingAgg?.averageRating || 0,
      ratingCount: ratingAgg?.totalReviews || 0,
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

  public createErrorResults(
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
}
