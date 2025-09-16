import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { AiStatsRepository } from './repositories/ai-stats.repository';
import { ReviewsRepository } from 'src/modules/reviews/reviews.repository';
import { RecordEventDto } from './dto/record-event.dto';
import { Between, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { subDays } from 'date-fns';
import { ProductVariant } from 'src/entities/variant.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly aiStatsRepo: AiStatsRepository,
    private readonly reviewsRepo: ReviewsRepository,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource
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

  async recordAiStat(params: {
    scope: 'store' | 'product';
    storeId?: string;
    productId?: string;
    features: Record<string, any>;
    prediction: Record<string, any>;
    modelVersion?: string;
  }) {
    const row = this.aiStatsRepo.create({
      scope: params.scope,
      storeId: params.storeId ?? null,
      productId: params.productId ?? null,
      features: params.features ?? {},
      prediction: params.prediction ?? {},
      modelVersion: params.modelVersion ?? null,
    } as any);
    return this.aiStatsRepo.save(row);
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

  async getAiStatsForStore(storeId: string, limit = 50) {
    return this.aiStatsRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
      take: limit,
    } as any);
  }

  async getAiStatsForProduct(productId: string, limit = 50) {
    return this.aiStatsRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: limit,
    } as any);
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
   * Build numeric feature vector for a product (same schema that training expects).
   *
   * The returned object is a flat map { featureName: number } which must match the
   * scaler.columns used during model training (order is determined at training time).
   *
   * Features included (baseline):
   *  - sales_7d, sales_14d, sales_30d
   *  - sales_7d_per_day, sales_30d_per_day, sales_ratio_7_30
   *  - views_7d, views_30d
   *  - addToCarts_7d
   *  - view_to_purchase_7d
   *  - avg_price, min_price, max_price
   *  - avg_rating, rating_count
   *  - inventory_qty (sum across variants)
   *  - days_since_last_restock (approx from inventory updatedAt)
   *  - day_of_week (0..6), is_weekend (0/1)
   *  - store_views_7d, store_purchases_7d
   *
   * @param productId - product UUID
   * @param storeId - optional store UUID (used for store-level features)
   */
  /* eslint-disable camelcase */
  async buildFeatureVector(
    productId: string,
    storeId?: string
  ): Promise<Record<string, number | null>> {
    // helper to get date strings
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const start7 = fmt(subDays(today, 6)); // inclusive 7-day window (today and 6 prev)
    const start14 = fmt(subDays(today, 13));
    const start30 = fmt(subDays(today, 29));
    const end = fmt(today);

    // 1) product-level aggregated counts from product_daily_stats (fast)
    const agg7 = await this.productStatsRepo.getAggregateRange(
      productId,
      start7,
      end
    );
    const agg14 = await this.productStatsRepo.getAggregateRange(
      productId,
      start14,
      end
    );
    const agg30 = await this.productStatsRepo.getAggregateRange(
      productId,
      start30,
      end
    );

    // 2) store-level aggregates (optional)
    let storeAgg7 = { views: 0, purchases: 0, addToCarts: 0, revenue: 0 };
    if (storeId) {
      storeAgg7 = await this.storeStatsRepo.getAggregateRange(
        storeId,
        start7,
        end
      );
    }

    // 3) price statistics from product variants (avg/min/max)
    const variantRepo = this.dataSource.getRepository(ProductVariant);
    const priceRaw = await variantRepo
      .createQueryBuilder('v')
      .select('AVG(v.price)::numeric', 'avg_price')
      .addSelect('MIN(v.price)::numeric', 'min_price')
      .addSelect('MAX(v.price)::numeric', 'max_price')
      .where('v.product = :productId', { productId })
      .getRawOne();

    const avgPrice = priceRaw?.avg_price ? Number(priceRaw.avg_price) : 0;
    const minPrice = priceRaw?.min_price
      ? Number(priceRaw.min_price)
      : avgPrice;
    const maxPrice = priceRaw?.max_price
      ? Number(priceRaw.max_price)
      : avgPrice;

    // 4) ratings
    const ratingAgg = await this.reviewsRepo.getRatingAggregate(productId);
    const avgRating = ratingAgg?.avg ?? 0;
    const ratingCount = ratingAgg?.count ?? 0;

    // 5) inventory: sum quantities across variants for this product
    // Inventory has variant -> ProductVariant -> product relation
    const invRepo = this.dataSource.getRepository(Inventory);
    // join variant to inventory to product
    const invRaw = await invRepo
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.quantity),0)', 'inventory_qty')
      .addSelect('MAX(inv.updatedAt)::text', 'last_updated_at')
      .innerJoin('inv.variant', 'v')
      .where('v.product = :productId', { productId })
      .getRawOne();

    const inventoryQty = invRaw ? Number(invRaw.inventory_qty || 0) : 0;
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

    // 6) simple conversion metrics
    const sales7 = agg7.purchases || 0;
    const sales30 = agg30.purchases || 0;
    const views7 = agg7.views || 0;
    const views30 = agg30.views || 0;
    const addToCarts7 = agg7.addToCarts || 0;

    const sales7PerDay = sales7 / 7;
    const sales30PerDay = sales30 / 30;
    const salesRatio7_30 = sales30 > 0 ? sales7 / (sales30 || 1) : 0;
    const viewToPurchase7 = views7 > 0 ? sales7 / views7 : 0;

    // 7) store-level features
    const storeViews7 = storeAgg7.views || 0;
    const storePurchases7 = storeAgg7.purchases || 0;

    // 8) time features
    const dow = today.getUTCDay(); // 0..6 (Sunday..Saturday)
    const isWeekend = dow === 0 || dow === 6 ? 1 : 0;

    const features: Record<string, number | null> = {
      sales_7d: sales7,
      sales_14d: agg14.purchases || 0,
      sales_30d: sales30,
      sales_7d_per_day: Number(sales7PerDay.toFixed(6)),
      sales_30d_per_day: Number(sales30PerDay.toFixed(6)),
      sales_ratio_7_30: Number(salesRatio7_30.toFixed(6)),
      views_7d: views7,
      views_30d: views30,
      addToCarts_7d: addToCarts7,
      view_to_purchase_7d: Number(viewToPurchase7.toFixed(6)),
      avg_price: avgPrice,
      min_price: minPrice,
      max_price: maxPrice,
      avg_rating: avgRating ?? 0,
      rating_count: ratingCount,
      inventory_qty: inventoryQty,
      days_since_restock: daysSinceRestock,
      day_of_week: dow,
      is_weekend: isWeekend,
      store_views_7d: storeViews7,
      store_purchases_7d: storePurchases7,
    };

    // Optionally coerce NaN => 0
    for (const k of Object.keys(features)) {
      const v = features[k];
      if (v === null || Number.isNaN(v as number)) features[k] = 0;
    }

    return features;
  }

  // --- queueAiScoring method ---
  /**
   * Build features (if needed), call external predictor via HttpService,
   * persist AiStat row using recordAiStat, and return prediction object.
   *
   * @param productId - product UUID (optional if scoring store-level)
   * @param storeId - store UUID (optional)
   * @param providedFeatures - optional features map (if caller already prepared features)
   */
  async queueAiScoring(
    productId?: string,
    storeId?: string,
    providedFeatures?: Record<string, any>
  ): Promise<any | null> {
    try {
      const features =
        providedFeatures ??
        (productId
          ? await this.buildFeatureVector(productId, storeId)
          : undefined);

      if (!features) {
        this.logger.warn('No features available for AI scoring');
        return null;
      }

      const predictorUrl =
        process.env.PREDICTOR_URL ?? 'http://predictor:8080/predict';
      const timeoutMs = Number(process.env.PREDICTOR_TIMEOUT_MS ?? 10000);

      const resp$ = this.httpService.post(
        predictorUrl,
        {
          features,
          productId,
          storeId,
        },
        {
          timeout: timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': process.env.PREDICTOR_AUTH_TOKEN ?? '', // optional internal auth
          },
        }
      );

      const resp = await lastValueFrom(resp$);
      const prediction = resp?.data ?? null;

      if (!prediction) {
        this.logger.warn('Predictor returned empty response');
        return null;
      }

      // persist AiStat row
      await this.recordAiStat({
        scope: productId ? 'product' : 'store',
        storeId,
        productId,
        features,
        prediction,
        modelVersion: prediction.modelVersion ?? null,
      });

      return prediction;
    } catch (err: any) {
      this.logger.error('queueAiScoring failed: ' + (err?.message ?? err));
      return null;
    }
  }
}
