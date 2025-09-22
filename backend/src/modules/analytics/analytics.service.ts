import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { ReviewsRepository } from 'src/modules/store/modules/reviews/reviews.repository';
import { RecordEventDto } from './dto/record-event.dto';
import { Between } from 'typeorm';
import { AiPredictorService } from 'src/modules/ai-predictor/ai-predictor.service';
import { AiPredictRow } from 'src/modules/ai-predictor/dto/ai-predict.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly predictorService: AiPredictorService,
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly reviewsRepo: ReviewsRepository
  ) {}

  async recordEvent(dto: RecordEventDto) {
    const e = this.eventsRepo.create({
      storeId: dto.storeId ?? null,
      productId: dto.productId ?? null,
      userId: dto.userId ?? null,
      eventType: dto.eventType,
      value: dto.value ?? null,
      meta: dto.meta ?? null,
    } as any);
    return this.eventsRepo.save(e);
  }

  async computeProductConversion(
    productId: string,
    from?: string,
    to?: string
  ) {
    const agg = await this.productStatsRepo.getAggregateRange(
      productId,
      from,
      to
    );
    if (agg.views > 0) {
      return {
        productId,
        views: agg.views,
        purchases: agg.purchases,
        addToCarts: agg.addToCarts,
        revenue: agg.revenue,
        conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
      };
    }

    const raw = await this.eventsRepo.aggregateProductRange(
      productId,
      from,
      to
    );
    return {
      productId,
      views: raw.views,
      purchases: raw.purchases,
      addToCarts: raw.addToCarts,
      revenue: raw.revenue,
      conversionRate: raw.views > 0 ? raw.purchases / raw.views : 0,
    };
  }

  async computeStoreConversion(storeId: string, from?: string, to?: string) {
    const agg = await this.storeStatsRepo.getAggregateRange(storeId, from, to);
    if (agg.views > 0) {
      return {
        storeId,
        views: agg.views,
        purchases: agg.purchases,
        addToCarts: agg.addToCarts,
        revenue: agg.revenue,
        checkouts: agg.checkouts,
        conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
        addToCartRate: agg.views > 0 ? agg.addToCarts / agg.views : 0,
        checkoutRate: agg.addToCarts > 0 ? agg.checkouts / agg.addToCarts : 0,
      };
    }

    const raw = await this.eventsRepo.aggregateStoreRange(storeId, from, to);
    return {
      storeId,
      views: raw.views,
      purchases: raw.purchases,
      addToCarts: raw.addToCarts,
      revenue: raw.revenue,
      checkouts: raw.checkouts,
      conversionRate: raw.views > 0 ? raw.purchases / raw.views : 0,
      addToCartRate: raw.views > 0 ? raw.addToCarts / raw.views : 0,
      checkoutRate: raw.addToCarts > 0 ? raw.checkouts / raw.addToCarts : 0,
    };
  }

  async getTopProductsByConversion(
    storeId: string,
    from?: string,
    to?: string,
    limit = 10
  ) {
    return this.eventsRepo.topProductsByConversion(storeId, from, to, limit);
  }

  async recomputeProductRating(productId: string) {
    return this.reviewsRepo.getRatingAggregate(productId);
  }

  /**
   * Get aggregated metrics for a store and (optionally) a daily timeseries.
   *
   * Returns an object with:
   *  - storeId
   *  - summary: aggregated metrics over the range (or all time if from/to omitted)
   *    { views, purchases, addToCarts, revenue, checkouts, conversionRate, addToCartRate, checkoutRate }
   *  - series: array of StoreDailyStats rows (empty if no from/to provided)
   *
   * @param storeId - UUID of the store
   * @param from - optional ISO date string 'YYYY-MM-DD' (inclusive)
   * @param to - optional ISO date string 'YYYY-MM-DD' (inclusive)
   */
  async getStoreStats(
    storeId: string,
    from?: string,
    to?: string
  ): Promise<{
    storeId: string;
    summary: {
      views: number;
      purchases: number;
      addToCarts: number;
      revenue: number;
      checkouts: number;
      conversionRate: number;
      addToCartRate: number;
      checkoutRate: number;
    };
    series: any[]; // StoreDailyStats[] - use concrete type if you prefer
  }> {
    // 1) summary - prefer aggregated daily table
    const agg = await this.storeStatsRepo.getAggregateRange(storeId, from, to);

    const summary = {
      views: agg.views,
      purchases: agg.purchases,
      addToCarts: agg.addToCarts,
      revenue: agg.revenue,
      checkouts: agg.checkouts,
      conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
      addToCartRate: agg.views > 0 ? agg.addToCarts / agg.views : 0,
      checkoutRate: agg.addToCarts > 0 ? agg.checkouts / agg.addToCarts : 0,
    };

    // 2) timeseries - return daily rows if date range provided; otherwise empty array
    let series: any[] = [];
    if (from || to) {
      const where: any = { storeId };
      if (from && to) {
        where.date = Between(from, to);
      } else if (from) {
        // date >= from
        where.date = Between(from, new Date().toISOString().slice(0, 10));
      } else if (to) {
        where.date = Between('1970-01-01', to);
      }
      series = await this.storeStatsRepo.find({
        where,
        order: { date: 'ASC' },
      } as any);
    }

    return {
      storeId,
      summary,
      series,
    };
  }

  /**
   * Get aggregated metrics for a product and (optionally) a daily timeseries.
   *
   * Returns an object with:
   *  - productId
   *  - summary: aggregated metrics (views, purchases, addToCarts, revenue, conversionRate)
   *  - series: array of ProductDailyStats rows (empty if no from/to provided)
   *  - rating: { count, avg } - recomputed from reviews table
   *
   * @param productId - UUID of the product
   * @param from - optional ISO date string 'YYYY-MM-DD' (inclusive)
   * @param to - optional ISO date string 'YYYY-MM-DD' (inclusive)
   */
  async getProductStats(
    productId: string,
    from?: string,
    to?: string
  ): Promise<{
    productId: string;
    summary: {
      views: number;
      purchases: number;
      addToCarts: number;
      revenue: number;
      conversionRate: number;
    };
    series: any[]; // ProductDailyStats[] - concrete type optional
    rating: { count: number; avg: number | null };
  }> {
    // 1) summary - prefer pre-aggregated daily stats
    const agg = await this.productStatsRepo.getAggregateRange(
      productId,
      from,
      to
    );

    const summary = {
      views: agg.views,
      purchases: agg.purchases,
      addToCarts: agg.addToCarts,
      revenue: agg.revenue,
      conversionRate: agg.views > 0 ? agg.purchases / agg.views : 0,
    };

    // 2) timeseries - return daily rows if date range provided; otherwise empty array
    let series: any[] = [];
    if (from || to) {
      const where: any = { productId };
      if (from && to) {
        where.date = Between(from, to);
      } else if (from) {
        where.date = Between(from, new Date().toISOString().slice(0, 10));
      } else if (to) {
        where.date = Between('1970-01-01', to);
      }
      series = await this.productStatsRepo.find({
        where,
        order: { date: 'ASC' },
      } as any);
    }

    // 3) rating - get count and average from reviews repository
    const rating = await this.reviewsRepo.getRatingAggregate(productId);

    return {
      productId,
      summary,
      series,
      rating,
    };
  }

  /**
   * predictorClient
   *
   * Helper that takes product feature rows (built by buildFeatureVector or other),
   * calls PredictorService to get predictions and persist AiStat rows.
   *
   * @param rows - array of { productId, storeId, features }
   * @param modelVersion - optional modelVersion string
   * @returns array of persisted AiStat + predictions (see PredictorService return)
   */
  async predictorClient(rows: AiPredictRow[], modelVersion?: string) {
    // Defensive: ensure features are shaped correctly (optional)
    if (!rows || rows.length === 0) return [];
    // Delegate to PredictorService which calls predictor and persists results
    return await this.predictorService.predictBatchAndPersist(
      rows,
      modelVersion
    );
  }
}
