import { Controller, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RecordEventDto } from 'dto/record-event.dto'; // Ensure path is correct
import {
  MessagePattern,
  EventPattern,
  Ctx,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  // ===========================================================================
  // Event Tracking (Fire & Forget)
  // ===========================================================================

  @EventPattern('analytics.track_event')
  async trackEvent(
    @Payload() event: RecordEventDto,
    @Ctx() context: RmqContext
  ) {
    this.ack(context);
    return this.analyticsService.trackEvent(event);
  }

  @EventPattern('analytics.record_event')
  async recordEvent(
    @Payload() dto: RecordEventDto,
    @Ctx() context: RmqContext
  ) {
    this.ack(context);
    return this.analyticsService.recordEvent(dto);
  }

  @EventPattern('analytics.batch_track')
  async batchTrack(
    @Payload() events: RecordEventDto[],
    @Ctx() context: RmqContext
  ) {
    this.ack(context);
    return this.analyticsService.batchTrack(events);
  }

  // ===========================================================================
  // Quick Stats (Request / Response)
  // ===========================================================================

  @MessagePattern('analytics.get_product_quick_stats')
  getProductQuickStats(@Payload() data: { productId: string }) {
    return this.analyticsService.getProductQuickStats(data.productId);
  }

  @MessagePattern('analytics.get_store_quick_stats')
  getStoreQuickStats(@Payload() data: { storeId: string }) {
    return this.analyticsService.getStoreQuickStats(data.storeId);
  }

  @MessagePattern('analytics.get_batch_product_stats')
  getBatchProductStats(@Payload() data: { productIds: string[] }) {
    return this.analyticsService.getBatchProductStats(data.productIds);
  }

  // ===========================================================================
  // Conversion Analytics
  // ===========================================================================

  @MessagePattern('analytics.compute_product_conversion')
  computeProductConversion(
    @Payload() data: { productId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.computeProductConversion(
      data.productId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.compute_store_conversion')
  computeStoreConversion(
    @Payload() data: { storeId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.computeStoreConversion(
      data.storeId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_top_products_conversion')
  getTopProductsByConversion(
    @Payload()
    data: {
      storeId: string;
      from?: string;
      to?: string;
      limit?: number;
    }
  ) {
    return this.analyticsService.getTopProductsByConversion(
      data.storeId,
      data.from,
      data.to,
      data.limit
    );
  }

  @MessagePattern('analytics.get_top_products_conversion_cached')
  getTopProductsByConversionCached(
    @Payload() data: { storeId?: string; limit?: number }
  ) {
    return this.analyticsService.getTopProductsByConversionCached(
      data.storeId,
      data.limit
    );
  }

  @MessagePattern('analytics.get_top_products_views')
  getTopProductsByViews(@Payload() data: { storeId?: string; limit?: number }) {
    return this.analyticsService.getTopProductsByViews(
      data.storeId,
      data.limit
    );
  }

  @MessagePattern('analytics.get_top_stores_revenue')
  getTopStoresByRevenue(@Payload() data: { limit?: number }) {
    return this.analyticsService.getTopStoresByRevenue(data.limit);
  }

  // ===========================================================================
  // Stats & Timeseries
  // ===========================================================================

  @MessagePattern('analytics.get_store_stats')
  getStoreStats(
    @Payload() data: { storeId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getStoreStats(
      data.storeId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_product_stats')
  getProductStats(
    @Payload() data: { productId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getProductStats(
      data.productId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_category_sales')
  getCategorySales(
    @Payload() data: { storeId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getCategorySales(
      data.storeId,
      data.from,
      data.to
    );
  }

  // ===========================================================================
  // Rating Analytics
  // ===========================================================================

  @MessagePattern('analytics.recompute_product_rating')
  recomputeProductRating(@Payload() data: { productId: string }) {
    return this.analyticsService.recomputeProductRating(data.productId);
  }

  @MessagePattern('analytics.get_store_ratings_summary')
  getStoreRatingsSummary(
    @Payload() data: { storeId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getStoreRatingsSummary(
      data.storeId,
      data.from,
      data.to
    );
  }

  // ===========================================================================
  // Funnel & Journey Analytics
  // ===========================================================================

  @MessagePattern('analytics.get_funnel_analysis')
  getFunnelAnalysis(
    @Payload()
    data: {
      storeId?: string;
      productId?: string;
      from?: string;
      to?: string;
    }
  ) {
    return this.analyticsService.getFunnelAnalysis(
      data.storeId,
      data.productId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_user_journey_analysis')
  getUserJourneyAnalysis(
    @Payload() data: { storeId?: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getUserJourneyAnalysis(
      data.storeId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_cohort_analysis')
  getCohortAnalysis(
    @Payload() data: { storeId: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getCohortAnalysis(
      data.storeId,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_revenue_trends')
  getRevenueTrends(
    @Payload() data: { storeId?: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getRevenueTrends(
      data.storeId,
      data.from,
      data.to
    );
  }

  // ===========================================================================
  // Comparison Analytics
  // ===========================================================================

  @MessagePattern('analytics.get_store_comparison')
  getStoreComparison(
    @Payload() data: { storeIds: string[]; from?: string; to?: string }
  ) {
    return this.analyticsService.getStoreComparison(
      data.storeIds,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_product_comparison')
  getProductComparison(
    @Payload() data: { productIds: string[]; from?: string; to?: string }
  ) {
    return this.analyticsService.getProductComparison(
      data.productIds,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_period_comparison')
  getPeriodComparison(
    @Payload()
    data: {
      storeId?: string;
      productId?: string;
      from?: string;
      to?: string;
    }
  ) {
    return this.analyticsService.getPeriodComparison(
      data.storeId,
      data.productId,
      data.from,
      data.to
    );
  }

  // ===========================================================================
  // Performance Analytics
  // ===========================================================================

  @MessagePattern('analytics.get_top_performing_stores')
  getTopPerformingStores(
    @Payload() data: { limit: number; from?: string; to?: string }
  ) {
    return this.analyticsService.getTopPerformingStores(
      data.limit,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_top_performing_products')
  getTopPerformingProducts(
    @Payload()
    data: {
      storeId?: string;
      limit?: number;
      from?: string;
      to?: string;
    }
  ) {
    return this.analyticsService.getTopPerformingProducts(
      data.storeId,
      data.limit || 10,
      data.from,
      data.to
    );
  }

  @MessagePattern('analytics.get_underperforming_analysis')
  getUnderperformingAnalysis(
    @Payload() data: { storeId?: string; from?: string; to?: string }
  ) {
    return this.analyticsService.getUnderperformingAnalysis(
      data.storeId,
      data.from,
      data.to
    );
  }

  // ===========================================================================
  // Data Sync & Health
  // ===========================================================================

  @EventPattern('analytics.sync_cached_stats')
  async syncCachedStats(
    @Payload() data: { productId?: string; storeId?: string },
    @Ctx() context: RmqContext
  ) {
    this.ack(context);
    return this.analyticsService.syncCachedStatsWithAnalytics(
      data.productId,
      data.storeId
    );
  }

  @MessagePattern('analytics.health_check')
  healthCheck() {
    return this.analyticsService.healthCheck();
  }

  @MessagePattern('analytics.get_system_stats')
  getSystemStats() {
    return this.analyticsService.getStats();
  }

  /**
   * Helper to manually acknowledge RabbitMQ messages.
   * Ensures messages are removed from queue only after processing starts.
   */
  private ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }
}
