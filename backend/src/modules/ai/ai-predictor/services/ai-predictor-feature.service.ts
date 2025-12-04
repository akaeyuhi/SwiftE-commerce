import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiPredictRow } from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { ErrorResult, FeatureVector } from 'src/modules/ai/ai-predictor/types';
import { eachDayOfInterval, format, isSameDay, subDays } from 'date-fns';
import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { IReviewsRepository } from 'src/common/contracts/reviews.contract';
import {
  IInventoryService,
  IVariantService,
} from 'src/common/contracts/ai-predictor.contract';
import { Between } from 'typeorm';

// Interface for TFT History
export interface DailyStat {
  date: string;
  purchases: number;
  views: number;
  revenue: number;
  inventoryQty: number;
}

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
  // Key now includes model type to separate static features from history
  private readonly featureCache = new Map<
    string,
    {
      data: FeatureVector | DailyStat[];
      timestamp: number;
    }
  >();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Main entry point: Prepares items based on the requested model type
   */
  public async preparePredictionItems(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelType: 'mlp' | 'tft' | 'lightgbm' | 'keras' = 'mlp'
  ): Promise<
    Array<AiPredictRow & { meta: { productId?: string; storeId?: string } }>
  > {
    if (!items || items.length === 0) return [];

    const normalized = await this.normalizeItems(items);

    if (modelType === 'tft') {
      await this.buildMissingHistory(normalized);
    } else {
      await this.buildMissingFeatures(normalized);
    }

    return normalized;
  }

  // ==========================================
  //  MLP / LightGBM Logic (Static Features)
  // ==========================================

  async buildFeatureVector(
    productId: string,
    storeId?: string
  ): Promise<FeatureVector> {
    const cacheKey = `mlp:${productId}:${storeId || 'none'}`;
    const cached = this.featureCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as FeatureVector;
    }

    try {
      const features = await this.computeFeatureVector(productId, storeId);

      this.featureCache.set(cacheKey, {
        data: features,
        timestamp: Date.now(),
      });

      if (this.featureCache.size > 1000) this.cleanupFeatureCache();

      return features;
    } catch (error) {
      this.logger.error(
        `Failed to build feature vector for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  private async buildMissingFeatures(
    normalized: Array<AiPredictRow & { meta: any }>
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const item of normalized) {
      if (this.hasValidFeatures(item)) continue;

      const promise = (async () => {
        if (!item.meta.productId) {
          item.features = {} as any;
          return;
        }
        try {
          item.features = await this.buildFeatureVector(
            item.meta.productId,
            item.meta.storeId
          );
        } catch (e) {
          item.features = {} as any;
          (item as any).__buildError = e.message;
        }
      })();

      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  // ==========================================
  //  TFT Logic (Time Series History)
  // ==========================================

  async buildTimeHistory(
    productId: string,
    storeId?: string
  ): Promise<DailyStat[]> {
    const cacheKey = `tft:${productId}:${storeId || 'none'}`;
    const cached = this.featureCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as DailyStat[];
    }

    try {
      const history = await this.computeTimeHistory(productId);

      this.featureCache.set(cacheKey, {
        data: history,
        timestamp: Date.now(),
      });

      if (this.featureCache.size > 1000) this.cleanupFeatureCache();

      return history;
    } catch (error) {
      this.logger.error(`Failed to build history for ${productId}:`, error);
      throw error;
    }
  }

  private async buildMissingHistory(
    normalized: Array<AiPredictRow & { meta: any }>
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const item of normalized) {
      // Check if history already exists
      if (item.history && item.history.length > 0) continue;

      const promise = (async () => {
        if (!item.meta.productId) {
          item.history = [];
          return;
        }
        try {
          item.history = await this.buildTimeHistory(
            item.meta.productId,
            item.meta.storeId
          );
        } catch (e) {
          item.history = [];
          (item as any).__buildError = e.message;
        }
      })();

      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  /**
   * Generates 30 days of daily stats for TFT
   */
  private async computeTimeHistory(productId: string): Promise<DailyStat[]> {
    const today = new Date();
    const endDate = today;
    const startDate = subDays(today, 29); // 30 days total (0-29)

    // Get current inventory to backfill history (simplistic assumption for now)
    const inventoryStats = await this.getInventoryStats(productId);
    const currentQty = inventoryStats.quantity || 0;

    const rawStats = await this.productStatsRepo.find({
      where: {
        productId,
        date: Between(startDate.toISOString(), endDate.toISOString()),
      },
      order: { date: 'ASC' },
    });

    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return dateRange.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Find stat for this specific day
      const dayStat = rawStats.find((s) => isSameDay(new Date(s.date), date));

      return {
        date: dateStr,
        purchases: dayStat?.purchases || 0,
        views: dayStat?.views || 0,
        revenue: Number(dayStat?.revenue || 0),
        inventoryQty: currentQty, // In a real scenario, you'd reconstruct historical inventory
      };
    });
  }

  // ==========================================
  //  Shared / Helper Methods
  // ==========================================

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
          history: [],
          meta: { productId: item, storeId: undefined },
        });
      } else {
        // Handle object or existing AiPredictRow
        const obj = item as AiPredictRow;
        normalized.push({
          productId: obj.productId,
          storeId: obj.storeId,
          features: obj.features || ({} as any),
          history: obj.history || [],
          meta: { productId: obj.productId, storeId: obj.storeId },
        });
      }
    }
    return normalized;
  }

  private hasValidFeatures(row: AiPredictRow): boolean {
    return row.features! && Object.keys(row.features).length > 0;
  }

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

    const dow = today.getUTCDay();
    const isWeekend = dow === 0 || dow === 6 ? 1 : 0;

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
      history: item.history,
      rawPrediction: null,
      error: `predictor_call_error: ${errorMessage}`,
    }));
  }
}
