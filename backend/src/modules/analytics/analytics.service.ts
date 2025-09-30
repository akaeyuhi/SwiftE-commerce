/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Between } from 'typeorm';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { ReviewsRepository } from 'src/modules/products/reviews/reviews.repository';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { RecordEventDto } from './dto/record-event.dto';
import { AiPredictRow } from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { AnalyticsQueueService } from './queues/analytics-queue.service';
import { BaseAnalyticsService } from 'src/common/abstracts/analytics/base.analytics.service';

export interface AnalyticsAggregationOptions {
  from?: string;
  to?: string;
  storeId?: string;
  productId?: string;
  limit?: number;
  includeTimeseries?: boolean;
}

/**
 * AnalyticsService
 *
 * Refactored service extending BaseAnalyticsService to provide comprehensive
 * analytics functionality including event tracking, aggregations, conversions,
 * and AI predictions.
 *
 * Implements the abstract methods from BaseAnalyticsService while maintaining
 * all existing functionality for store/product analytics, ratings, and predictions.
 */
@Injectable()
export class AnalyticsService extends BaseAnalyticsService<RecordEventDto> {
  constructor(
    private readonly queueService: AnalyticsQueueService,
    private readonly predictorService: AiPredictorService,
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    private readonly reviewsRepo: ReviewsRepository
  ) {
    super();
  }

  // ===============================
  // BaseAnalyticsService Implementation
  // ===============================

  /**
   * Track analytics event (delegates to queue for async processing)
   */
  async trackEvent(event: RecordEventDto): Promise<void> {
    await this.queueService.addEvent(event);
  }

  /**
   * Validate aggregator names and options
   */
  protected validateAggregator(
    name: string,
    options?: AnalyticsAggregationOptions
  ): void {
    const validAggregators = [
      // Conversion analytics
      'product_conversion',
      'store_conversion',
      'top_products_by_conversion',

      // Stats with timeseries
      'store_stats',
      'product_stats',

      // Rating analytics
      'product_rating',
      'store_ratings_summary',

      // Advanced analytics
      'funnel_analysis',
      'user_journey',
      'cohort_analysis',
      'revenue_trends',

      // Comparative analytics
      'store_comparison',
      'product_comparison',
      'period_comparison',

      // Performance analytics
      'top_performing_stores',
      'top_performing_products',
      'underperforming_analysis',
    ];

    if (!validAggregators.includes(name)) {
      throw new Error(
        `Unknown aggregator: ${name}. Valid options: ${validAggregators.join(', ')}`
      );
    }

    // Validate date range
    if (options?.from && options?.to) {
      const fromDate = new Date(options.from);
      const toDate = new Date(options.to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format.');
      }

      if (fromDate > toDate) {
        throw new Error('from date must be before or equal to to date');
      }

      // Prevent very large date ranges (optional business rule)
      const daysDiff =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        throw new Error('Date range cannot exceed 365 days');
      }
    }

    // Validate required parameters for specific aggregators
    if (name.includes('product_') && !options?.productId) {
      throw new Error(`${name} requires productId parameter`);
    }

    if (
      name.includes('store_') &&
      name !== 'top_performing_stores' &&
      !options?.storeId
    ) {
      throw new Error(`${name} requires storeId parameter`);
    }

    // Validate limit parameter
    if (options?.limit && (options.limit < 1 || options.limit > 1000)) {
      throw new Error('limit must be between 1 and 1000');
    }
  }

  /**
   * Run aggregation based on aggregator name and options
   */
  protected async runAggregation(
    name: string,
    options: AnalyticsAggregationOptions = {}
  ): Promise<any> {
    const {
      from,
      to,
      storeId,
      productId,
      limit = 10,
      includeTimeseries = false,
    } = options;

    switch (name) {
      // Conversion Analytics
      case 'product_conversion':
        return this.computeProductConversion(productId!, from, to);

      case 'store_conversion':
        return this.computeStoreConversion(storeId!, from, to);

      case 'top_products_by_conversion':
        return this.getTopProductsByConversion(storeId!, from, to, limit);

      // Stats with Timeseries
      case 'store_stats':
        return this.getStoreStats(storeId!, from, to);

      case 'product_stats':
        return this.getProductStats(productId!, from, to);

      // Rating Analytics
      case 'product_rating':
        return this.recomputeProductRating(productId!);

      case 'store_ratings_summary':
        return this.getStoreRatingsSummary(storeId!, from, to);

      // Advanced Analytics
      case 'funnel_analysis':
        return this.getFunnelAnalysis(storeId, productId, from, to);

      case 'user_journey':
        return this.getUserJourneyAnalysis(storeId, from, to);

      case 'cohort_analysis':
        return this.getCohortAnalysis(storeId!, from, to);

      case 'revenue_trends':
        return this.getRevenueTrends(storeId, from, to);

      // Comparative Analytics
      case 'store_comparison':
        return this.getStoreComparison([storeId!], from, to);

      case 'product_comparison':
        return this.getProductComparison([productId!], from, to);

      case 'period_comparison':
        return this.getPeriodComparison(storeId, productId, from, to);

      // Performance Analytics
      case 'top_performing_stores':
        return this.getTopPerformingStores(limit, from, to);

      case 'top_performing_products':
        return this.getTopPerformingProducts(storeId, limit, from, to);

      case 'underperforming_analysis':
        return this.getUnderperformingAnalysis(storeId, from, to);

      default:
        throw new Error(`Aggregator ${name} not implemented`);
    }
  }

  // ===============================
  // Existing Methods (Preserved)
  // ===============================

  /**
   * Record event directly (bypass queue for synchronous processing)
   * @deprecated Use trackEvent() instead for better performance
   */
  async recordEvent(dto: RecordEventDto) {
    const event = this.eventsRepo.create({
      storeId: dto.storeId ?? null,
      productId: dto.productId ?? null,
      userId: dto.userId ?? null,
      eventType: dto.eventType,
      value: dto.value ?? null,
      meta: dto.meta ?? null,
      invokedOn: dto.invokedOn ?? (dto.productId ? 'product' : 'store'),
    } as any);
    return this.eventsRepo.save(event);
  }

  async computeProductConversion(
    productId: string,
    from?: string,
    to?: string
  ) {
    // Try aggregated stats first for better performance
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
        addToCartRate: agg.views > 0 ? agg.addToCarts / agg.views : 0,
        source: 'aggregated_stats',
      };
    }

    // Fallback to raw events if no aggregated data
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
      addToCartRate: raw.views > 0 ? raw.addToCarts / raw.views : 0,
      source: 'raw_events',
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
        source: 'aggregated_stats',
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
      source: 'raw_events',
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

  async getStoreStats(storeId: string, from?: string, to?: string) {
    // Get summary
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

    // Get timeseries if date range provided
    let series: any[] = [];
    if (from || to) {
      const where: any = { storeId };
      if (from && to) {
        where.date = Between(from, to);
      } else if (from) {
        where.date = Between(from, new Date().toISOString().slice(0, 10));
      } else if (to) {
        where.date = Between('1970-01-01', to);
      }
      series = await this.storeStatsRepo.find({
        where,
        order: { date: 'ASC' },
      } as any);
    }

    return { storeId, summary, series };
  }

  async getProductStats(productId: string, from?: string, to?: string) {
    // Get summary
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

    // Get timeseries if date range provided
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

    // Get rating
    const rating = await this.reviewsRepo.getRatingAggregate(productId);

    return { productId, summary, series, rating };
  }

  async predictorClient(rows: AiPredictRow[], modelVersion?: string) {
    if (!rows || rows.length === 0) return [];
    return await this.predictorService.predictBatchAndPersist(
      rows,
      modelVersion
    );
  }

  // ===============================
  // New Advanced Analytics Methods
  // ===============================

  private async getStoreRatingsSummary(
    storeId: string,
    from?: string,
    to?: string
  ) {
    // This would require a query that joins products with reviews for the store
    // Implementation depends on your schema relationships
    const query = `
      SELECT 
        COUNT(r.id) as total_reviews,
        AVG(r.rating) as average_rating,
        COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN r.rating <= 2 THEN 1 END) as negative_reviews
      FROM reviews r
      INNER JOIN products p ON r.product_id = p.id
      WHERE p.store_id = $1
      ${from ? 'AND r.created_at >= $2' : ''}
      ${to ? 'AND r.created_at <= $3' : ''}
    `;

    // Execute raw query or implement using query builder
    return { storeId, summary: 'Implementation needed based on your schema' };
  }

  private async getFunnelAnalysis(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    // Analyze conversion funnel: View -> Add to Cart -> Purchase
    const baseQuery = this.eventsRepo.createQueryBuilder('event').where('1=1'); // Base condition

    if (storeId) baseQuery.andWhere('event.storeId = :storeId', { storeId });
    if (productId)
      baseQuery.andWhere('event.productId = :productId', { productId });
    if (from) baseQuery.andWhere('event.createdAt >= :from', { from });
    if (to) baseQuery.andWhere('event.createdAt <= :to', { to });

    const [views, addToCarts, purchases] = await Promise.all([
      baseQuery
        .clone()
        .andWhere('event.eventType = :type', { type: 'view' })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('event.eventType = :type', { type: 'add_to_cart' })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('event.eventType = :type', { type: 'purchase' })
        .getCount(),
    ]);

    return {
      funnel: { views, addToCarts, purchases },
      rates: {
        viewToCart:
          views > 0 ? ((addToCarts / views) * 100).toFixed(2) : '0.00',
        cartToPurchase:
          addToCarts > 0 ? ((purchases / addToCarts) * 100).toFixed(2) : '0.00',
        overallConversion:
          views > 0 ? ((purchases / views) * 100).toFixed(2) : '0.00',
      },
    };
  }

  private async getUserJourneyAnalysis(
    storeId?: string,
    from?: string,
    to?: string
  ) {
    // Analyze common user paths and drop-off points
    return { message: 'User journey analysis - implementation needed' };
  }

  private async getCohortAnalysis(storeId: string, from?: string, to?: string) {
    // Analyze user retention and behavior over time
    return { message: 'Cohort analysis - implementation needed' };
  }

  private async getRevenueTrends(storeId?: string, from?: string, to?: string) {
    // Analyze revenue trends over time
    const query = this.eventsRepo
      .createQueryBuilder('event')
      .select([
        'DATE(event.createdAt) as date',
        'SUM(event.value) as revenue',
        'COUNT(*) as transactions',
      ])
      .where('event.eventType = :type', { type: 'purchase' })
      .groupBy('DATE(event.createdAt)')
      .orderBy('date', 'ASC');

    if (storeId) query.andWhere('event.storeId = :storeId', { storeId });
    if (from) query.andWhere('event.createdAt >= :from', { from });
    if (to) query.andWhere('event.createdAt <= :to', { to });

    return query.getRawMany();
  }

  private async getStoreComparison(
    storeIds: string[],
    from?: string,
    to?: string
  ) {
    const comparisons = await Promise.all(
      storeIds.map((storeId) => this.computeStoreConversion(storeId, from, to))
    );
    return { stores: comparisons };
  }

  private async getProductComparison(
    productIds: string[],
    from?: string,
    to?: string
  ) {
    const comparisons = await Promise.all(
      productIds.map((productId) =>
        this.computeProductConversion(productId, from, to)
      )
    );
    return { products: comparisons };
  }

  private async getPeriodComparison(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    // Compare current period with previous period
    return { message: 'Period comparison - implementation needed' };
  }

  private async getTopPerformingStores(
    limit: number,
    from?: string,
    to?: string
  ) {
    // Get top stores by revenue, conversion rate, etc.
    return { message: 'Top performing stores - implementation needed' };
  }

  private async getTopPerformingProducts(
    storeId?: string,
    limit: number = 10,
    from?: string,
    to?: string
  ) {
    return this.getTopProductsByConversion(storeId!, from, to, limit);
  }

  private async getUnderperformingAnalysis(
    storeId?: string,
    from?: string,
    to?: string
  ) {
    // Identify products/stores that are underperforming
    return { message: 'Underperforming analysis - implementation needed' };
  }
}
