import { Injectable, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  AiPredictRow,
  AiPredictBatchRequest,
  AiPredictResult,
} from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import { subDays } from 'date-fns';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { DataSource } from 'typeorm';

import { StoreDailyStatsRepository } from 'src/modules/analytics/repositories/store-daily-stats.repository';

import { ProductDailyStatsRepository } from 'src/modules/analytics/repositories/product-daily-stats.repository';
import { ReviewsRepository } from 'src/modules/store/products/reviews/reviews.repository';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { AxiosResponse } from 'axios';

/**
 * AiPredictorService
 *
 * Responsibilities:
 *  - Build a numeric feature vector for a product (buildFeatureVector)
 *  - Call external predictor endpoint (/predict_batch)
 *  - Persist returned predictions into DB (predictBatchAndPersist)
 *
 * Notes about repositories:
 *  - PredictorRepository is expected to expose helper methods that return
 *    aggregated numbers. Example methods used below (implement them in repository):
 *      - getProductAggregate(productId, fromIso, toIso) => { views, purchases, addToCarts, revenue }
 *      - getStoreAggregate(storeId, fromIso, toIso) => same shape as above
 *      - getVariantPriceStats(productId) => { avgPrice, minPrice, maxPrice }
 *      - getRatingAggregate(productId) => { avg, count }
 *      - getInventoryAggregate(productId) => { inventoryQty, lastUpdatedAt } (lastUpdatedAt iso string or null)
 *
 *  Keeping data-logic inside repository keeps the service easy to test and the SQL centralized.
 */
@Injectable()
export class AiPredictorService {
  private readonly logger = new Logger(AiPredictorService.name);
  private readonly predictorUrl: string;
  private readonly token?: string;
  private readonly chunkSize: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly predictorRepo: AiPredictorRepository,
    private readonly dataSource: DataSource,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly reviewsRepo: ReviewsRepository,
    private readonly aiLogs: AiLogsService,
    private readonly aiAudit: AiAuditService
  ) {
    this.predictorUrl =
      process.env.PREDICTOR_URL ?? 'http://predictor:8080/predict_batch';
    this.token = process.env.PREDICTOR_AUTH_TOKEN ?? undefined;
    this.chunkSize = Number(process.env.PREDICTOR_CHUNK_SIZE ?? 50);
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

  /**
   * Predict batch: accepts mixed inputs:
   * - string productId
   * - { productId, storeId? }
   * - PredictRow { productId?, storeId?, features }
   *
   * For rows lacking `features`, this method will call `buildFeatureVector`.
   *
   * Returns array of results objects:
   *  { index, productId?, storeId?, features, rawPrediction, score, label, error? }
   *
   * The `features` field is always included so callers can persist the full snapshot.
   */
  async predictBatch(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ): Promise<
    Array<
      AiPredictResult & {
        productId?: string;
        storeId?: string;
        features?: Record<string, number>;
        rawPrediction?: any;
        error?: string;
      }
    >
  > {
    if (!items || items.length === 0) return [];

    // Normalize items -> PredictRow[] placeholders
    const normalized: AiPredictRow[] = [];
    const meta: Array<{ productId?: string; storeId?: string }> = [];

    for (const it of items) {
      if (typeof it === 'string') {
        meta.push({ productId: it, storeId: undefined });
        normalized.push({
          productId: it,
          storeId: undefined,
          features: {} as any,
        });
      } else if (
        (it as AiPredictRow).features &&
        Object.keys((it as AiPredictRow).features).length
      ) {
        const row = it as AiPredictRow;
        meta.push({ productId: row.productId!, storeId: row.storeId! });
        normalized.push(row);
      } else {
        const obj = it as { productId: string; storeId?: string };
        meta.push({ productId: obj.productId, storeId: obj.storeId });
        normalized.push({
          productId: obj.productId,
          storeId: obj.storeId,
          features: {} as any,
        });
      }
    }

    // Build missing feature vectors in chunks
    for (let i = 0; i < normalized.length; i += this.chunkSize) {
      const chunk = normalized.slice(i, i + this.chunkSize);
      const builders = chunk.map(async (r) => {
        if (r.features && Object.keys(r.features).length > 0) return;
        const pid = r.productId;
        const sid = (r as any).storeId ?? undefined;
        if (!pid) {
          r.features = {} as any;
          (r as any).__buildError = 'missing_product_id';
          return;
        }
        try {
          const features = await this.buildFeatureVector(pid, sid);
          r.features = features as any;
        } catch (err: any) {
          r.features = {} as any;
          (r as any).__buildError = err?.message ?? String(err);
          this.logger.warn(
            `buildFeatureVector failed for ${pid}: ${(err && err.message) || err}`
          );
        }
      });
      await Promise.all(builders);
    }

    const resultsOut: Array<
      AiPredictResult & {
        productId?: string;
        storeId?: string;
        features?: Record<string, number>;
        rawPrediction?: any;
        error?: string;
      }
    > = [];

    // Send to external predictor in chunks
    for (let i = 0; i < normalized.length; i += this.chunkSize) {
      const chunk = normalized.slice(i, i + this.chunkSize);
      const payload: AiPredictBatchRequest = { rows: chunk };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.token) headers['X-Internal-Token'] = this.token;

      try {
        const resp$ = this.httpService.post<AiPredictResult>(
          this.predictorUrl,
          payload,
          {
            headers,
          }
        );
        const resp = await lastValueFrom(resp$);
        const data = resp?.data;
        const preds = Array.isArray(data?.results) ? data.results : [];

        await this.storeResult(chunk, resp, data);

        for (let j = 0; j < chunk.length; j++) {
          const globalIndex = i + j;
          const row = chunk[j];
          const md = meta[globalIndex] ?? {};
          const buildErr = (row as any).__buildError;

          if (buildErr) {
            resultsOut.push({
              index: globalIndex,
              score: NaN,
              label: 'error',
              productId: md.productId,
              storeId: md.storeId,
              features: row.features as any,
              rawPrediction: preds[j] ?? null,
              error: `feature_build_error: ${buildErr}`,
            } as any);
            continue;
          }

          const pred = preds[j];

          if (!pred) {
            resultsOut.push({
              index: globalIndex,
              score: NaN,
              label: 'no_prediction',
              productId: md.productId,
              storeId: md.storeId,
              features: row.features as any,
              rawPrediction: null,
              error: 'no_prediction_returned',
            } as any);
            continue;
          }

          // normalize score
          const score =
            typeof pred.score === 'number'
              ? pred.score
              : typeof pred === 'number'
                ? pred
                : (pred?.prob ?? pred?.value ?? NaN);
          const scoreVal = Number.isFinite(Number(score)) ? Number(score) : NaN;
          const label =
            pred.label ??
            (scoreVal > 0.7 ? 'high' : scoreVal > 0.4 ? 'medium' : 'low');

          resultsOut.push({
            index: globalIndex,
            score: scoreVal,
            label,
            productId: md.productId,
            storeId: md.storeId,
            features: row.features as any,
            rawPrediction: pred,
          } as any);
        }
      } catch (err: any) {
        this.logger.error(
          'predictBatch: predictor call failed: ' + (err?.message ?? err)
        );
        // mark each item in chunk with error
        for (let j = 0; j < chunk.length; j++) {
          const globalIndex = i + j;
          const md = meta[globalIndex] ?? {};
          resultsOut.push({
            index: globalIndex,
            score: NaN,
            label: 'error',
            productId: md.productId,
            storeId: md.storeId,
            features: chunk[j].features as any,
            rawPrediction: null,
            error: `predictor_call_error: ${err?.message ?? err}`,
          } as any);
        }
      }
    }

    return resultsOut;
  }

  // -------------------- persist (reuses predictBatch) --------------------

  /**
   * Build features (if necessary), predict, and persist successful predictions.
   *
   * - items: same flexible input as predictBatch
   * - modelVersion: optional string to attach to persisted rows
   *
   * returns array: [{ predictorStat: PredictorStatEntity, prediction: rawPrediction }]
   */
  async predictBatchAndPersist(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string
  ): Promise<Array<{ predictorStat: AiPredictorStat; prediction: any }>> {
    const results = await this.predictBatch(items);
    const persisted: Array<{
      predictorStat: AiPredictorStat;
      prediction: any;
    }> = [];

    for (const r of results) {
      // skip items that had build errors or predictor errors
      if (r.error) {
        // optionally: persist an error row if you want to track failures
        this.logger.warn(
          `Skipping persist for product ${r.productId} due to error: ${r.error}`
        );
        continue;
      }

      try {
        // create DB row - predictorRepo extends BaseRepository and has createEntity
        const created = await this.predictorRepo.createEntity({
          scope: r.productId ? 'product' : 'store',
          productId: r.productId ?? null,
          storeId: r.storeId ?? null,
          features: r.features ?? {},
          prediction: r.rawPrediction ?? { score: r.score, label: r.label },
          modelVersion: modelVersion ?? null,
        } as any);
        persisted.push({
          predictorStat: created as AiPredictorStat,
          prediction: r.rawPrediction ?? { score: r.score, label: r.label },
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to persist prediction for ${r.productId}: ${err?.message ?? err}`
        );
      }
    }

    return persisted;
  }

  private async storeResult(
    chunk: AiPredictRow[],
    resp: AxiosResponse<AiPredictResult>,
    data: AiPredictResult
  ) {
    try {
      await this.aiLogs.record({
        userId: undefined, // caller may pass user context if available — you can extend predictBatch signature
        storeId: undefined,
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

    // store the raw predictor response encrypted
    try {
      await this.aiAudit.storeEncryptedResponse({
        feature: 'predictor',
        provider: 'predictor',
        model: undefined,
        rawResponse: resp.data ?? data,
        userId: null,
        storeId: null,
      });
    } catch (err) {
      this.logger.warn(
        'AiAudit.storeEncryptedResponse failed for predictor: ' +
          (err as any)?.message
      );
    }
  }
}
