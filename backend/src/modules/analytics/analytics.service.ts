import { Injectable } from '@nestjs/common';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { BaseAnalyticsService } from 'src/common/abstracts/analytics/base.analytics.service';
import { AnalyticsAggregationOptions } from 'src/modules/analytics/types';
import { EventTrackingService } from './services/event-tracking.service';
import { QuickStatsService } from './services/quick-stats.service';
import { ConversionAnalyticsService } from './services/conversion-analytics.service';
import { RatingAnalyticsService } from './services/rating-analytics.service';
import { FunnelAnalyticsService } from './services/funnel-analytics.service';
import { ComparisonAnalyticsService } from './services/comparison-analytics.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { DataSyncService } from './services/data-sync.service';
import { HealthCheckService } from './services/health-check.service';

/**
 * Main Analytics Service (Orchestrator)
 *
 * Delegates to specialized services for different analytics domains
 */
@Injectable()
export class AnalyticsService extends BaseAnalyticsService<RecordEventDto> {
  constructor(
    private readonly eventTracking: EventTrackingService,
    private readonly quickStats: QuickStatsService,
    private readonly conversionAnalytics: ConversionAnalyticsService,
    private readonly ratingAnalytics: RatingAnalyticsService,
    private readonly funnelAnalytics: FunnelAnalyticsService,
    private readonly comparisonAnalytics: ComparisonAnalyticsService,
    private readonly performanceAnalytics: PerformanceAnalyticsService,
    private readonly dataSync: DataSyncService,
    private readonly healthCheckService: HealthCheckService
  ) {
    super();
  }

  // ===============================
  // Event Tracking (Delegation)
  // ===============================

  async trackEvent(event: RecordEventDto): Promise<void> {
    return this.eventTracking.trackEvent(event);
  }

  async recordEvent(dto: RecordEventDto) {
    return this.eventTracking.recordEvent(dto);
  }

  async batchTrack(events: RecordEventDto[]) {
    return this.eventTracking.batchTrack(events);
  }

  // ===============================
  // Quick Stats (Delegation)
  // ===============================

  async getProductQuickStats(productId: string) {
    return this.quickStats.getProductQuickStats(productId);
  }

  async getStoreQuickStats(storeId: string) {
    return this.quickStats.getStoreQuickStats(storeId);
  }

  async getBatchProductStats(productIds: string[]) {
    return this.quickStats.getBatchProductStats(productIds);
  }

  // ===============================
  // Conversion Analytics (Delegation)
  // ===============================

  async computeProductConversion(
    productId: string,
    from?: string,
    to?: string
  ) {
    return this.conversionAnalytics.computeProductConversion(
      productId,
      from,
      to
    );
  }

  async computeStoreConversion(storeId: string, from?: string, to?: string) {
    return this.conversionAnalytics.computeStoreConversion(storeId, from, to);
  }

  async getTopProductsByConversion(
    storeId: string,
    from?: string,
    to?: string,
    limit = 10
  ) {
    return this.conversionAnalytics.getTopProductsByConversion(
      storeId,
      from,
      to,
      limit
    );
  }

  async getTopProductsByConversionCached(storeId?: string, limit = 10) {
    return this.conversionAnalytics.getTopProductsByConversionCached(
      storeId,
      limit
    );
  }

  async getTopProductsByViews(storeId?: string, limit = 10) {
    return this.conversionAnalytics.getTopProductsByViews(storeId, limit);
  }

  async getTopStoresByRevenue(limit = 10) {
    return this.conversionAnalytics.getTopStoresByRevenue(limit);
  }

  // ===============================
  // Stats & Timeseries (Delegation)
  // ===============================

  async getStoreStats(storeId: string, from?: string, to?: string) {
    return this.conversionAnalytics.getStoreStats(storeId, from, to);
  }

  async getProductStats(productId: string, from?: string, to?: string) {
    return this.conversionAnalytics.getProductStats(productId, from, to);
  }

  async getCategorySales(storeId: string, from?: string, to?: string) {
    return this.conversionAnalytics.getCategorySales(storeId, from, to);
  }

  // ===============================
  // Rating Analytics (Delegation)
  // ===============================

  async recomputeProductRating(productId: string) {
    return this.ratingAnalytics.recomputeProductRating(productId);
  }

  async getStoreRatingsSummary(storeId: string, from?: string, to?: string) {
    return this.ratingAnalytics.getStoreRatingsSummary(storeId, from, to);
  }

  // ===============================
  // Funnel & Journey Analytics (Delegation)
  // ===============================

  async getFunnelAnalysis(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    return this.funnelAnalytics.getFunnelAnalysis(storeId, productId, from, to);
  }

  async getUserJourneyAnalysis(storeId?: string, from?: string, to?: string) {
    return this.funnelAnalytics.getUserJourneyAnalysis(storeId, from, to);
  }

  async getCohortAnalysis(storeId: string, from?: string, to?: string) {
    return this.funnelAnalytics.getCohortAnalysis(storeId, from, to);
  }

  async getRevenueTrends(storeId?: string, from?: string, to?: string) {
    return this.funnelAnalytics.getRevenueTrends(storeId, from, to);
  }

  // ===============================
  // Comparison Analytics (Delegation)
  // ===============================

  async getStoreComparison(storeIds: string[], from?: string, to?: string) {
    return this.comparisonAnalytics.getStoreComparison(storeIds, from, to);
  }

  async getProductComparison(productIds: string[], from?: string, to?: string) {
    return this.comparisonAnalytics.getProductComparison(productIds, from, to);
  }

  async getPeriodComparison(
    storeId?: string,
    productId?: string,
    from?: string,
    to?: string
  ) {
    return this.comparisonAnalytics.getPeriodComparison(
      storeId,
      productId,
      from,
      to
    );
  }

  // ===============================
  // Performance Analytics (Delegation)
  // ===============================

  async getTopPerformingStores(limit: number, from?: string, to?: string) {
    return this.performanceAnalytics.getTopPerformingStores(limit, from, to);
  }

  async getTopPerformingProducts(
    storeId?: string,
    limit = 10,
    from?: string,
    to?: string
  ) {
    return this.performanceAnalytics.getTopPerformingProducts(
      storeId,
      limit,
      from,
      to
    );
  }

  async getUnderperformingAnalysis(
    storeId?: string,
    from?: string,
    to?: string
  ) {
    return this.performanceAnalytics.getUnderperformingAnalysis(
      storeId,
      from,
      to
    );
  }

  // ===============================
  // Data Sync (Delegation)
  // ===============================

  async syncCachedStatsWithAnalytics(productId?: string, storeId?: string) {
    return this.dataSync.syncCachedStatsWithAnalytics(productId, storeId);
  }

  // ===============================
  // Health & Monitoring (Delegation)
  // ===============================

  async healthCheck() {
    return this.healthCheckService.healthCheck();
  }

  async getStats() {
    return this.healthCheckService.getStats();
  }

  // ===============================
  // Aggregation Router
  // ===============================

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

    // Validate required parameters
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

    if (
      options?.limit !== undefined &&
      (options.limit < 1 || options.limit > 1000)
    ) {
      throw new Error('limit must be between 1 and 1000');
    }
  }

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

      // Stats
      case 'storeStats':
        return this.getStoreStats(storeId!, from, to);
      case 'productStats':
        return this.getProductStats(productId!, from, to);

      // Ratings
      case 'productRating':
        return this.recomputeProductRating(productId!);
      case 'storeRatingsSummary':
        return this.getStoreRatingsSummary(storeId!, from, to);

      // Funnel & Journey
      case 'funnelAnalysis':
        return this.getFunnelAnalysis(storeId, productId, from, to);
      case 'userJourney':
        return this.getUserJourneyAnalysis(storeId, from, to);
      case 'cohortAnalysis':
        return this.getCohortAnalysis(storeId!, from, to);
      case 'revenueTrends':
        return this.getRevenueTrends(storeId, from, to);

      // Comparisons
      case 'storeComparison':
        return this.getStoreComparison([storeId!], from, to);
      case 'productComparison':
        return this.getProductComparison([productId!], from, to);
      case 'periodComparison':
        return this.getPeriodComparison(storeId, productId, from, to);

      // Performance
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
}
