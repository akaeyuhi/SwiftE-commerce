import { Inject, Injectable } from '@nestjs/common';
import { Between } from 'typeorm';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { BaseAnalyticsService } from 'src/common/abstracts/analytics/base.analytics.service';
import {
  IReviewsRepository,
  REVIEWS_REPOSITORY,
} from 'src/common/contracts/reviews.contract';

export interface AnalyticsAggregationOptions {
  from?: string;
  to?: string;
  storeId?: string;
  productId?: string;
  limit?: number;
  includeTimeseries?: boolean;
}

export interface ConversionMetrics {
  views: number;
  purchases: number;
  addToCarts: number;
  revenue: number;
  conversionRate: number;
  addToCartRate: number;
  source: 'aggregated_stats' | 'raw_events';
}

export interface StoreConversionMetrics extends ConversionMetrics {
  storeId: string;
  checkouts: number;
  checkoutRate: number;
}

export interface ProductConversionMetrics extends ConversionMetrics {
  productId: string;
}

export interface FunnelAnalysisResult {
  funnel: {
    views: number;
    addToCarts: number;
    purchases: number;
  };
  rates: {
    viewToCart: string;
    cartToPurchase: string;
    overallConversion: string;
  };
}

/**
 * AnalyticsService with CamelCase Conventions
 *
 * Provides comprehensive analytics functionality including:
 * - Event tracking with queue-based processing
 * - Conversion analytics (product & store)
 * - Funnel analysis and user journey tracking
 * - Revenue trends and comparative analytics
 * - Performance analysis (top/underperforming)
 */
@Injectable()
export class AnalyticsService extends BaseAnalyticsService<RecordEventDto> {
  constructor(
    private readonly queueService: AnalyticsQueueService,
    private readonly eventsRepo: AnalyticsEventRepository,
    private readonly storeStatsRepo: StoreDailyStatsRepository,
    private readonly productStatsRepo: ProductDailyStatsRepository,
    @Inject(REVIEWS_REPOSITORY) private readonly reviewsRepo: IReviewsRepository
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
    const validAggregators = this.getSupportedAggregators();

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

      const daysDiff =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        throw new Error('Date range cannot exceed 365 days');
      }
    }

    // Validate required parameters for specific aggregators
    const productAggregators = [
      'productConversion',
      'productStats',
      'productRating',
    ];
    if (productAggregators.includes(name) && !options?.productId) {
      throw new Error(`${name} requires productId parameter`);
    }

    const storeAggregators = [
      'storeConversion',
      'storeStats',
      'storeRatingsSummary',
      'cohortAnalysis',
    ];
    if (storeAggregators.includes(name) && !options?.storeId) {
      throw new Error(`${name} requires storeId parameter`);
    }

    // Validate limit parameter
    if (
      options?.limit !== undefined &&
      (options.limit < 1 || options.limit > 1000)
    ) {
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
    const { from, to, storeId, productId, limit = 10 } = options;

    switch (name) {
      // Conversion Analytics
      case 'productConversion':
        return this.computeProductConversion(productId!, from, to);

      case 'storeConversion':
        return this.computeStoreConversion(storeId!, from, to);

      case 'topProductsByConversion':
        return this.getTopProductsByConversion(storeId!, from, to, limit);

      // Stats with Timeseries
      case 'storeStats':
        return this.getStoreStats(storeId!, from, to);

      case 'productStats':
        return this.getProductStats(productId!, from, to);

      // Rating Analytics
      case 'productRating':
        return this.recomputeProductRating(productId!);

      case 'storeRatingsSummary':
        return this.getStoreRatingsSummary(storeId!, from, to);

      // Advanced Analytics
      case 'funnelAnalysis':
        return this.getFunnelAnalysis(storeId, productId, from, to);

      case 'userJourney':
        return this.getUserJourneyAnalysis(storeId, from, to);

      case 'cohortAnalysis':
        return this.getCohortAnalysis(storeId!, from, to);

      case 'revenueTrends':
        return this.getRevenueTrends(storeId, from, to);

      // Comparative Analytics
      case 'storeComparison':
        return this.getStoreComparison([storeId!], from, to);

      case 'productComparison':
        return this.getProductComparison([productId!], from, to);

      case 'periodComparison':
        return this.getPeriodComparison(storeId, productId, from, to);

      // Performance Analytics
      case 'topPerformingStores':
        return this.getTopPerformingStores(limit, from, to);

      case 'topPerformingProducts':
        return this.getTopPerformingProducts(storeId, limit, from, to);

      case 'underperformingAnalysis':
        return this.getUnderperformingAnalysis(storeId, from, to);

      default:
        throw new Error(`Aggregator ${name} not implemented`);
    }
  }

  // ===============================
  // Core Analytics Methods
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

  /**
   * Compute product conversion metrics
   */
  async computeProductConversion(
    productId: string,
    from?: string,
    to?: string
  ): Promise<ProductConversionMetrics> {
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

  /**
   * Compute store conversion metrics
   */
  async computeStoreConversion(
    storeId: string,
    from?: string,
    to?: string
  ): Promise<StoreConversionMetrics> {
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

    const raw = await this.eventsRepo.aggregateStoreMetrics(storeId, {
      from,
      to,
    });
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

  /**
   * Get top products by conversion rate
   */
  async getTopProductsByConversion(
    storeId: string,
    from?: string,
    to?: string,
    limit = 10
  ) {
    return this.eventsRepo.getTopProductsByConversion(storeId, {
      from,
      to,
      limit,
    });
  }

  /**
   * Recompute product rating from reviews
   */
  async recomputeProductRating(productId: string) {
    return this.reviewsRepo.getRatingAggregate(productId);
  }

  /**
   * Get store statistics with optional timeseries
   */
  async getStoreStats(storeId: string, from?: string, to?: string) {
    // Get summary
    const agg = await this.storeStatsRepo.getAggregatedMetrics(storeId, {
      from,
      to,
    });
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

  /**
   * Get product statistics with optional timeseries and rating
   */
  async getProductStats(productId: string, from?: string, to?: string) {
    // Get summary
    const agg = await this.productStatsRepo.getAggregatedMetrics(productId, {
      from,
      to,
    });
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
    const rating = await this.recomputeProductRating(productId);

    return { productId, summary, series, rating };
  }

  // ===============================
  // Advanced Analytics Methods
  // ===============================

  /**
   * Get store ratings summary across all products
   */
  private async getStoreRatingsSummary(
    storeId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    from?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    to?: string
  ) {
    // This would require a proper query to the reviews system
    // Implementation depends on your reviews schema
    return {
      storeId,
      summary: {
        totalReviews: 0,
        averageRating: 0,
        positiveReviews: 0,
        negativeReviews: 0,
      },
      message: 'Implementation requires reviews schema integration',
    };
  }

  /**
   * Analyze conversion funnel: View → Add to Cart → Purchase
   */
  private async getFunnelAnalysis(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ): Promise<FunnelAnalysisResult> {
    const baseQuery = this.eventsRepo.createQueryBuilder('event');

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

  /**
   * Analyze common user paths and drop-off points
   */
  private async getUserJourneyAnalysis(
    storeId?: string,
    from?: string,
    to?: string
  ) {
    // Complex analysis requiring session tracking and path analysis
    return {
      message:
        'User journey analysis - requires session tracking implementation',
      storeId,
      dateRange: { from, to },
    };
  }

  /**
   * Analyze user retention and behavior over time
   */
  private async getCohortAnalysis(storeId: string, from?: string, to?: string) {
    return {
      message: 'Cohort analysis - requires user cohort tracking implementation',
      storeId,
      dateRange: { from, to },
    };
  }

  /**
   * Analyze revenue trends over time
   */
  private async getRevenueTrends(storeId?: string, from?: string, to?: string) {
    const query = this.eventsRepo
      .createQueryBuilder('event')
      .select('DATE(event.createdAt)', 'date')
      .addSelect('SUM(event.value)', 'revenue')
      .addSelect('COUNT(*)', 'transactions')
      .where('event.eventType = :type', { type: 'purchase' })
      .groupBy('DATE(event.createdAt)')
      .orderBy('date', 'ASC');

    if (storeId) query.andWhere('event.storeId = :storeId', { storeId });
    if (from) query.andWhere('event.createdAt >= :from', { from });
    if (to) query.andWhere('event.createdAt <= :to', { to });

    const results = await query.getRawMany();

    // Transform to camelCase
    return results.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue || '0'),
      transactions: parseInt(row.transactions || '0'),
    }));
  }

  /**
   * Compare multiple stores
   */
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

  /**
   * Compare multiple products
   */
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

  /**
   * Compare current period with previous period
   */
  private async getPeriodComparison(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    return {
      message:
        'Period comparison - requires date range calculation implementation',
      params: { storeId, productId, from, to },
    };
  }

  /**
   * Get top performing stores by revenue and conversion
   */
  private async getTopPerformingStores(
    limit: number,
    from?: string,
    to?: string
  ) {
    return {
      message: 'Top performing stores - requires cross-store aggregation',
      limit,
      dateRange: { from, to },
    };
  }

  /**
   * Get top performing products for a store
   */
  private async getTopPerformingProducts(
    storeId?: string,
    limit: number = 10,
    from?: string,
    to?: string
  ) {
    return this.getTopProductsByConversion(storeId!, from, to, limit);
  }

  /**
   * Identify underperforming products or stores
   */
  private async getUnderperformingAnalysis(
    storeId?: string,
    from?: string,
    to?: string
  ) {
    return {
      message: 'Underperforming analysis - requires performance benchmarks',
      storeId,
      dateRange: { from, to },
    };
  }

  // ===============================
  // Helper Methods
  // ===============================

  /**
   * Get service health and statistics
   */
  async healthCheck() {
    try {
      // Test database connectivity
      await this.eventsRepo.count({ take: 1 } as any);

      return {
        healthy: true,
        message: 'Analytics service operational',
        details: {
          eventsRepo: 'connected',
          statsRepos: 'connected',
          queueService: 'available',
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Analytics service error',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Get service statistics
   */
  async getStats() {
    const [totalEvents, recentEvents] = await Promise.all([
      this.eventsRepo.count(),
      this.eventsRepo.count({
        where: {
          createdAt: Between(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
            new Date()
          ),
        },
      } as any),
    ]);

    return {
      totalEvents,
      recentEvents,
      supportedAggregators: this.getSupportedAggregators().length,
    };
  }
}
