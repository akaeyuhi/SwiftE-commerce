import { Inject, Injectable } from '@nestjs/common';
import { Between, Repository } from 'typeorm';
import { AnalyticsEventRepository } from './repositories/analytics-event.repository';
import { StoreDailyStatsRepository } from './repositories/store-daily-stats.repository';
import { ProductDailyStatsRepository } from './repositories/product-daily-stats.repository';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { BaseAnalyticsService } from 'src/common/abstracts/analytics/base.analytics.service';
import { IReviewsRepository } from 'src/common/contracts/reviews.contract';
import {
  AnalyticsAggregationOptions,
  FunnelAnalysisResult,
  ProductConversionMetrics,
  ProductQuickStats,
  StoreConversionMetrics,
  StoreQuickStats,
} from 'src/modules/analytics/types';
import { Store } from 'src/entities/store/store.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from 'src/entities/store/product/product.entity';

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
    @Inject(IReviewsRepository)
    private readonly reviewsRepo: IReviewsRepository,
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>
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
  // Quick Stats (Using Cached Values)
  // ===============================

  /**
   * Get product quick stats from cached values (instant response)
   */
  async getProductQuickStats(productId: string): Promise<ProductQuickStats> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: [
        'id',
        'name',
        'averageRating',
        'reviewCount',
        'likeCount',
        'viewCount',
        'totalSales',
      ],
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const conversionRate =
      product.viewCount > 0
        ? (product.totalSales / product.viewCount) * 100
        : 0;

    return {
      productId: product.id,
      name: product.name,
      viewCount: product.viewCount || 0,
      likeCount: product.likeCount || 0,
      totalSales: product.totalSales || 0,
      reviewCount: product.reviewCount || 0,
      averageRating: product.averageRating ? Number(product.averageRating) : 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      source: 'cached',
    };
  }

  /**
   * Get store quick stats from cached values (instant response)
   */
  async getStoreQuickStats(storeId: string): Promise<StoreQuickStats> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'orderCount',
        'totalRevenue',
      ],
    });

    if (!store) {
      throw new Error('Store not found');
    }

    const averageOrderValue =
      store.orderCount > 0 ? Number(store.totalRevenue) / store.orderCount : 0;

    return {
      storeId: store.id,
      name: store.name,
      productCount: store.productCount || 0,
      followerCount: store.followerCount || 0,
      orderCount: store.orderCount || 0,
      totalRevenue: Number(store.totalRevenue) || 0,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      source: 'cached',
    };
  }

  /**
   * Get batch product stats (efficient for listings)
   */
  async getBatchProductStats(
    productIds: string[]
  ): Promise<ProductQuickStats[]> {
    const products = await this.productRepo.find({
      where: productIds.map((id) => ({ id })),
      select: [
        'id',
        'name',
        'averageRating',
        'reviewCount',
        'likeCount',
        'viewCount',
        'totalSales',
      ],
    });

    return products.map((product) => {
      const conversionRate =
        product.viewCount > 0
          ? (product.totalSales / product.viewCount) * 100
          : 0;

      return {
        productId: product.id,
        name: product.name,
        viewCount: product.viewCount || 0,
        likeCount: product.likeCount || 0,
        totalSales: product.totalSales || 0,
        reviewCount: product.reviewCount || 0,
        averageRating: product.averageRating
          ? Number(product.averageRating)
          : 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        source: 'cached',
      };
    });
  }

  // ===============================
  // Enhanced Conversion Analytics
  // ===============================

  /**
   * Compute product conversion with hybrid approach
   * - Use cached values for current totals
   * - Use aggregated stats for time-range queries
   */
  async computeProductConversion(
    productId: string,
    from?: string,
    to?: string
  ): Promise<ProductConversionMetrics> {
    // If no date range, use cached values (fastest)
    if (!from && !to) {
      const quickStats = await this.getProductQuickStats(productId);

      // Get add-to-cart data from events (not cached)
      const addToCartData = await this.eventsRepo.aggregateProductMetrics(
        productId,
        { from, to }
      );

      return {
        productId,
        views: quickStats.viewCount,
        purchases: quickStats.totalSales,
        addToCarts: addToCartData.addToCarts || 0,
        revenue: 0, // Would need to join with order_items
        conversionRate: quickStats.conversionRate / 100,
        addToCartRate:
          quickStats.viewCount > 0
            ? addToCartData.addToCarts / quickStats.viewCount
            : 0,
        source: 'hybridCached',
      };
    }

    // For date ranges, use aggregated stats
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
        source: 'aggregatedStats',
      };
    }

    // Fallback to raw events
    const raw = await this.eventsRepo.aggregateProductMetrics(productId, {
      from,
      to,
    });
    return {
      productId,
      views: raw.views,
      purchases: raw.purchases,
      addToCarts: raw.addToCarts,
      revenue: raw.revenue,
      conversionRate: raw.views > 0 ? raw.purchases / raw.views : 0,
      addToCartRate: raw.views > 0 ? raw.addToCarts / raw.views : 0,
      source: 'rawEvents',
    };
  }

  /**
   * Compute store conversion with hybrid approach
   */
  async computeStoreConversion(
    storeId: string,
    from?: string,
    to?: string
  ): Promise<StoreConversionMetrics> {
    // If no date range, use cached values for revenue/orders
    if (!from && !to) {
      const quickStats = await this.getStoreQuickStats(storeId);

      // Get event-based metrics
      const eventData = await this.eventsRepo.aggregateStoreMetrics(
        storeId,
        {}
      );

      return {
        storeId,
        views: eventData.views || 0,
        purchases: quickStats.orderCount,
        addToCarts: eventData.addToCarts || 0,
        revenue: quickStats.totalRevenue,
        checkouts: eventData.checkouts || 0,
        conversionRate:
          eventData.views > 0 ? quickStats.orderCount / eventData.views : 0,
        addToCartRate:
          eventData.views > 0 ? eventData.addToCarts / eventData.views : 0,
        checkoutRate:
          eventData.addToCarts > 0
            ? eventData.checkouts / eventData.addToCarts
            : 0,
        source: 'hybridCached',
      };
    }

    // For date ranges, use aggregated stats
    const agg = await this.storeStatsRepo.getAggregatedMetrics(storeId, {
      from,
      to,
    });

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
        source: 'aggregatedStats',
      };
    }

    // Fallback to raw events
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
      source: 'rawEvents',
    };
  }

  // ===============================
  // Ranking & Leaderboards
  // ===============================

  /**
   * Get top products by views (using cached stats)
   */
  async getTopProductsByViews(
    storeId?: string,
    limit = 10
  ): Promise<ProductQuickStats[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.name',
        'p.viewCount',
        'p.likeCount',
        'p.totalSales',
        'p.reviewCount',
        'p.averageRating',
      ])
      .where('p.deletedAt IS NULL')
      .orderBy('p.viewCount', 'DESC')
      .limit(limit);

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    const products = await qb.getMany();

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      viewCount: p.viewCount || 0,
      likeCount: p.likeCount || 0,
      totalSales: p.totalSales || 0,
      reviewCount: p.reviewCount || 0,
      averageRating: p.averageRating ? Number(p.averageRating) : 0,
      conversionRate: p.viewCount > 0 ? (p.totalSales / p.viewCount) * 100 : 0,
      source: 'cached',
    }));
  }

  /**
   * Get top products by conversion rate (using cached stats)
   */
  async getTopProductsByConversionCached(
    storeId?: string,
    limit = 10
  ): Promise<ProductQuickStats[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.name',
        'p.viewCount',
        'p.likeCount',
        'p.totalSales',
        'p.reviewCount',
        'p.averageRating',
      ])
      .where('p.deletedAt IS NULL')
      .andWhere('p.viewCount > :minViews', { minViews: 10 }) // Filter noise
      .orderBy('(p.totalSales::float / NULLIF(p.viewCount, 0))', 'DESC')
      .limit(limit);

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    const products = await qb.getMany();

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      viewCount: p.viewCount || 0,
      likeCount: p.likeCount || 0,
      totalSales: p.totalSales || 0,
      reviewCount: p.reviewCount || 0,
      averageRating: p.averageRating ? Number(p.averageRating) : 0,
      conversionRate:
        p.viewCount > 0
          ? Math.round((p.totalSales / p.viewCount) * 10000) / 100
          : 0,
      source: 'cached',
    }));
  }

  /**
   * Get top stores by revenue (using cached stats)
   */
  async getTopStoresByRevenue(limit = 10): Promise<StoreQuickStats[]> {
    const stores = await this.storeRepo.find({
      select: [
        'id',
        'name',
        'productCount',
        'followerCount',
        'orderCount',
        'totalRevenue',
      ],
      order: { totalRevenue: 'DESC' },
      take: limit,
    });

    return stores.map((s) => ({
      storeId: s.id,
      name: s.name,
      productCount: s.productCount || 0,
      followerCount: s.followerCount || 0,
      orderCount: s.orderCount || 0,
      totalRevenue: Number(s.totalRevenue) || 0,
      averageOrderValue:
        s.orderCount > 0
          ? Math.round((Number(s.totalRevenue) / s.orderCount) * 100) / 100
          : 0,
      source: 'cached',
    }));
  }

  // ===============================
  // Data Consistency Methods
  // ===============================

  /**
   * Sync cached stats with analytics aggregations
   * Run this periodically (e.g., daily) to ensure consistency
   */
  async syncCachedStatsWithAnalytics(productId?: string, storeId?: string) {
    if (productId) {
      return this.syncProductStats(productId);
    }

    if (storeId) {
      return this.syncStoreStats(storeId);
    }

    // Sync all (admin operation)
    return this.syncAllStats();
  }

  private async syncProductStats(productId: string) {
    // Get analytics totals
    const analytics = await this.eventsRepo.aggregateProductMetrics(
      productId,
      {}
    );

    // Update product cached stats
    await this.productRepo.update(productId, {
      viewCount: analytics.views || 0,
      totalSales: analytics.purchases || 0,
      // likeCount and reviewCount are managed by their own subscribers
    });

    return { productId, synced: true };
  }

  private async syncStoreStats(storeId: string) {
    // Store stats are primarily managed by order/product subscribers
    // This mainly validates consistency
    const analytics = await this.storeStatsRepo.getAggregatedMetrics(
      storeId,
      {}
    );

    return {
      storeId,
      analytics: {
        views: analytics.views,
        purchases: analytics.purchases,
        revenue: analytics.revenue,
      },
      message: 'Store stats are managed by triggers/subscribers',
    };
  }

  private async syncAllStats() {
    return {
      message: 'Full sync should be run as a background job',
      recommendation: 'Use a scheduled task or admin command',
    };
  }

  // ===============================
  // Advanced Analytics Methods
  // ===============================

  /**
   * Get store ratings summary across all products
   */
  private async getStoreRatingsSummary(
    storeId: string,
    from?: string,
    to?: string
  ) {
    const stats = await this.reviewsRepo.getReviewsSummary(storeId, from, to);

    const totalReviews = parseInt(stats.totalReviews) || 0;
    const positiveReviews = parseInt(stats.positiveReviews) || 0;
    const negativeReviews = parseInt(stats.negativeReviews) || 0;

    // Calculate rating distribution percentages
    const distribution =
      totalReviews > 0
        ? {
            fiveStar: Math.round(
              (parseInt(stats.fiveStarReviews) / totalReviews) * 100
            ),
            fourStar: Math.round(
              (parseInt(stats.fourStarReviews) / totalReviews) * 100
            ),
            threeStar: Math.round(
              (parseInt(stats.threeStarReviews) / totalReviews) * 100
            ),
            twoStar: Math.round(
              (parseInt(stats.twoStarReviews) / totalReviews) * 100
            ),
            oneStar: Math.round(
              (parseInt(stats.oneStarReviews) / totalReviews) * 100
            ),
          }
        : {
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0,
          };

    // Get top reviewed products
    const topReviewedProducts =
      await this.reviewsRepo.getTopReviewedProducts(storeId);
    return {
      storeId,
      dateRange: { from, to },
      summary: {
        totalReviews,
        averageRating: parseFloat(stats.averageRating) || 0,
        positiveReviews,
        negativeReviews,
        positiveRate:
          totalReviews > 0
            ? Math.round((positiveReviews / totalReviews) * 100)
            : 0,
        negativeRate:
          totalReviews > 0
            ? Math.round((negativeReviews / totalReviews) * 100)
            : 0,
      },
      distribution,
      topReviewedProducts: topReviewedProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        reviewCount: parseInt(p.reviewCount),
        averageRating: parseFloat(p.averageRating) || 0,
      })),
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
    const [views, addToCarts, purchases] = await this.eventsRepo.getFunnelData(
      storeId,
      productId,
      from,
      to
    );

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
    // Build base query
    const qb = this.eventsRepo
      .createQueryBuilder('event')
      .select('event.userId', 'userId')
      .addSelect('event.eventType', 'eventType')
      .addSelect('event.productId', 'productId')
      .addSelect('event.createdAt', 'timestamp')
      .where('event.userId IS NOT NULL');

    if (storeId) {
      qb.andWhere('event.storeId = :storeId', { storeId });
    }
    if (from) {
      qb.andWhere('event.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('event.createdAt <= :to', { to });
    }

    qb.orderBy('event.userId', 'ASC')
      .addOrderBy('event.createdAt', 'ASC')
      .limit(10000); // Limit for performance

    const events = await qb.getRawMany();

    // Group events by user
    const userJourneys = new Map<string, any[]>();
    for (const event of events) {
      if (!userJourneys.has(event.userId)) {
        userJourneys.set(event.userId, []);
      }
      userJourneys.get(event.userId)!.push(event);
    }

    // Analyze common paths
    const pathCounts = new Map<string, number>();
    const dropOffPoints = new Map<string, number>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, journey] of userJourneys.entries()) {
      // Create path signature (first 5 events)
      const path = journey
        .slice(0, 5)
        .map((e) => e.eventType)
        .join(' → ');

      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);

      // Identify drop-off (last event that's not purchase)
      const lastEvent = journey[journey.length - 1];
      if (lastEvent.eventType !== 'purchase') {
        dropOffPoints.set(
          lastEvent.eventType,
          (dropOffPoints.get(lastEvent.eventType) || 0) + 1
        );
      }
    }

    // Convert to arrays and sort
    const commonPaths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({
        path,
        userCount: count,
        percentage: Math.round((count / userJourneys.size) * 100),
      }));

    const dropOffs = Array.from(dropOffPoints.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([stage, count]) => ({
        stage,
        dropOffCount: count,
        percentage: Math.round((count / userJourneys.size) * 100),
      }));

    // Calculate average journey length
    const totalEvents = Array.from(userJourneys.values()).reduce(
      (sum, journey) => sum + journey.length,
      0
    );
    const avgJourneyLength =
      userJourneys.size > 0
        ? Math.round((totalEvents / userJourneys.size) * 10) / 10
        : 0;

    // Calculate conversion rate
    const convertedUsers = Array.from(userJourneys.values()).filter((journey) =>
      journey.some((e) => e.eventType === 'purchase')
    ).length;

    return {
      storeId,
      dateRange: { from, to },
      summary: {
        totalUsers: userJourneys.size,
        averageJourneyLength: avgJourneyLength,
        convertedUsers,
        conversionRate:
          userJourneys.size > 0
            ? Math.round((convertedUsers / userJourneys.size) * 100)
            : 0,
      },
      commonPaths,
      dropOffPoints: dropOffs,
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
    return this.eventsRepo.getRevenueTrends(storeId, from, to);
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
    if (!from || !to) {
      throw new Error(
        'Both from and to dates are required for period comparison'
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodLength = toDate.getTime() - fromDate.getTime();

    // Calculate previous period dates
    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - periodLength);

    const prevFrom = prevFromDate.toISOString().slice(0, 10);
    const prevTo = prevToDate.toISOString().slice(0, 10);

    // Get metrics for both periods
    let currentMetrics: any;
    let previousMetrics: any;

    if (productId) {
      [currentMetrics, previousMetrics] = await Promise.all([
        this.computeProductConversion(productId, from, to),
        this.computeProductConversion(productId, prevFrom, prevTo),
      ]);
    } else if (storeId) {
      [currentMetrics, previousMetrics] = await Promise.all([
        this.computeStoreConversion(storeId, from, to),
        this.computeStoreConversion(storeId, prevFrom, prevTo),
      ]);
    } else {
      throw new Error('Either storeId or productId is required');
    }

    // Calculate changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const changes = {
      views: calculateChange(currentMetrics.views, previousMetrics.views),
      purchases: calculateChange(
        currentMetrics.purchases,
        previousMetrics.purchases
      ),
      addToCarts: calculateChange(
        currentMetrics.addToCarts,
        previousMetrics.addToCarts
      ),
      revenue: calculateChange(
        currentMetrics.revenue || 0,
        previousMetrics.revenue || 0
      ),
      conversionRate: calculateChange(
        currentMetrics.conversionRate,
        previousMetrics.conversionRate
      ),
    };

    return {
      storeId,
      productId,
      currentPeriod: {
        from,
        to,
        metrics: currentMetrics,
      },
      previousPeriod: {
        from: prevFrom,
        to: prevTo,
        metrics: previousMetrics,
      },
      changes,
      trend:
        changes.revenue > 0 ? 'up' : changes.revenue < 0 ? 'down' : 'stable',
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
    // If no date range, use cached stats
    if (!from && !to) {
      return this.getTopStoresByRevenue(limit);
    }

    // For date ranges, aggregate from daily stats
    const qb = this.storeStatsRepo
      .createQueryBuilder('stats')
      .select('stats.storeId', 'storeId')
      .addSelect('SUM(stats.views)', 'totalViews')
      .addSelect('SUM(stats.purchases)', 'totalPurchases')
      .addSelect('SUM(stats.revenue)', 'totalRevenue')
      .addSelect('SUM(stats.addToCarts)', 'totalAddToCarts')
      .groupBy('stats.storeId');

    if (from && to) {
      qb.where('stats.date BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.where('stats.date >= :from', { from });
    } else if (to) {
      qb.where('stats.date <= :to', { to });
    }

    const storeStats = await qb
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    // Enrich with store details
    const storeIds = storeStats.map((s) => s.storeId);
    const stores = await this.storeRepo.find({
      where: storeIds.map((id) => ({ id })),
      select: ['id', 'name'],
    });

    const storeMap = new Map(stores.map((s) => [s.id, s.name]));

    return {
      dateRange: { from, to },
      stores: storeStats.map((stat, index) => ({
        rank: index + 1,
        storeId: stat.storeId,
        storeName: storeMap.get(stat.storeId) || 'Unknown',
        views: parseInt(stat.totalViews) || 0,
        purchases: parseInt(stat.totalPurchases) || 0,
        revenue: parseFloat(stat.totalRevenue) || 0,
        addToCarts: parseInt(stat.totalAddToCarts) || 0,
        conversionRate:
          stat.totalViews > 0
            ? Math.round((stat.totalPurchases / stat.totalViews) * 10000) / 100
            : 0,
        averageOrderValue:
          stat.totalPurchases > 0
            ? Math.round((stat.totalRevenue / stat.totalPurchases) * 100) / 100
            : 0,
      })),
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
    // Get all products/stores with their metrics
    let items: any[];
    let type: 'product' | 'store';

    if (storeId) {
      // Analyze products in store
      type = 'product';
      const qb = this.productStatsRepo
        .createQueryBuilder('stats')
        .leftJoin('products', 'p', 'p.id = stats.productId')
        .select('stats.productId', 'id')
        .addSelect('p.name', 'name')
        .addSelect('SUM(stats.views)', 'views')
        .addSelect('SUM(stats.purchases)', 'purchases')
        .addSelect('SUM(stats.revenue)', 'revenue')
        .where('p.storeId = :storeId', { storeId })
        .andWhere('p.deletedAt IS NULL')
        .groupBy('stats.productId')
        .addGroupBy('p.name');

      if (from && to) {
        qb.andWhere('stats.date BETWEEN :from AND :to', { from, to });
      }

      items = await qb.getRawMany();
    } else {
      // Analyze all stores
      type = 'store';
      const qb = this.storeStatsRepo
        .createQueryBuilder('stats')
        .leftJoin('stores', 's', 's.id = stats.storeId')
        .select('stats.storeId', 'id')
        .addSelect('s.name', 'name')
        .addSelect('SUM(stats.views)', 'views')
        .addSelect('SUM(stats.purchases)', 'purchases')
        .addSelect('SUM(stats.revenue)', 'revenue')
        .groupBy('stats.storeId')
        .addGroupBy('s.name');

      if (from && to) {
        qb.andWhere('stats.date BETWEEN :from AND :to', { from, to });
      }

      items = await qb.getRawMany();
    }

    // Calculate benchmarks (median values)
    const validItems = items.filter((i) => parseInt(i.views) > 10); // Min views threshold

    if (validItems.length === 0) {
      return {
        type,
        storeId,
        dateRange: { from, to },
        message: 'Not enough data to perform analysis',
        underperforming: [],
      };
    }

    const sortedByConversion = [...validItems]
      .map((i) => ({
        ...i,
        conversionRate:
          parseInt(i.views) > 0 ? parseInt(i.purchases) / parseInt(i.views) : 0,
      }))
      .sort((a, b) => a.conversionRate - b.conversionRate);

    const medianConversion =
      sortedByConversion[Math.floor(sortedByConversion.length / 2)]
        .conversionRate;

    const sortedByRevenue = [...validItems]
      .map((i) => ({ ...i, revenue: parseFloat(i.revenue) }))
      .sort((a, b) => a.revenue - b.revenue);

    const medianRevenue =
      sortedByRevenue[Math.floor(sortedByRevenue.length / 2)].revenue;

    // Identify underperformers (below 50% of median in both metrics)
    const underperforming = validItems
      .map((item) => {
        const views = parseInt(item.views);
        const purchases = parseInt(item.purchases);
        const revenue = parseFloat(item.revenue);
        const conversionRate = views > 0 ? purchases / views : 0;

        const conversionGap =
          ((medianConversion - conversionRate) / medianConversion) * 100;
        const revenueGap = ((medianRevenue - revenue) / medianRevenue) * 100;

        return {
          id: item.id,
          name: item.name,
          views,
          purchases,
          revenue,
          conversionRate: Math.round(conversionRate * 10000) / 100,
          conversionGap: Math.round(conversionGap),
          revenueGap: Math.round(revenueGap),
          overallScore: Math.round((conversionGap + revenueGap) / 2),
        };
      })
      .filter((item) => item.conversionGap > 50 && item.revenueGap > 50)
      .sort((a, b) => b.overallScore - a.overallScore);

    // Generate recommendations
    const recommendations = underperforming.slice(0, 10).map((item) => {
      const issues: string[] = [];
      const actions: string[] = [];

      if (item.views < 100) {
        issues.push('Low visibility');
        actions.push('Improve SEO, add better images, update description');
      }
      if (item.conversionRate < 1) {
        issues.push('Poor conversion');
        actions.push('Review pricing, add reviews, improve product details');
      }
      if (item.revenue < medianRevenue * 0.3) {
        issues.push('Low revenue');
        actions.push('Consider promotions, bundle deals, or price adjustment');
      }

      return {
        ...item,
        issues,
        recommendedActions: actions,
      };
    });

    return {
      type,
      storeId,
      dateRange: { from, to },
      benchmarks: {
        medianConversionRate: Math.round(medianConversion * 10000) / 100,
        medianRevenue: Math.round(medianRevenue * 100) / 100,
        totalAnalyzed: validItems.length,
      },
      underperforming: recommendations,
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
