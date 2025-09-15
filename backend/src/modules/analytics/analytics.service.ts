import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { AiStatsRepository } from './repositories/ai-stats.repository';
import { ReviewsRepository } from 'src/modules/reviews/reviews.repository';
import { RecordEventDto } from './dto/record-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly aiStatsRepo: AiStatsRepository,
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
}
