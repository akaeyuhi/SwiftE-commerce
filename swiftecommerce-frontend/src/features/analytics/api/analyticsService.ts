import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  StoreAnalytics,
  ConversionMetrics,
  FunnelAnalysis,
  CohortAnalysis,
  UserJourney,
  PeriodComparison,
  ProductPerformance,
  AnalyticsEvent,
  AnalyticsParams,
  TopProductsParams,
  CompareStoresParams,
} from '../types/analytics.types';

export class AnalyticsService extends BaseService {
  /**
   * Get store analytics
   */
  async getStoreAnalytics(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<StoreAnalytics> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<StoreAnalytics>(urlWithParams);
  }

  /**
   * Get store conversion metrics
   */
  async getStoreConversion(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<ConversionMetrics> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE_CONVERSION, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ConversionMetrics>(urlWithParams);
  }

  /**
   * Get store ratings analytics
   */
  async getStoreRatings(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE_RATINGS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Get store quick stats
   */
  async getStoreQuickStats(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE_QUICK_STATS, {
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  async getCategorySales(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<any[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.CATEGORY_SALES, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<any[]>(urlWithParams);
  }

  async getStoreInsights(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE_INSIGHTS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Get funnel analysis
   */
  async getFunnelAnalysis(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<FunnelAnalysis> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.FUNNEL, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<FunnelAnalysis>(urlWithParams);
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<any[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.REVENUE_TRENDS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<any[]>(urlWithParams);
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<CohortAnalysis> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.COHORT_ANALYSIS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<CohortAnalysis>(urlWithParams);
  }

  /**
   * Get user journey analysis
   */
  async getUserJourney(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<UserJourney> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.USER_JOURNEY, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<UserJourney>(urlWithParams);
  }

  /**
   * Get period comparison
   */
  async getPeriodComparison(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<PeriodComparison> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PERIOD_COMPARISON, {
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<PeriodComparison>(urlWithParams);
  }

  /**
   * Get top performing products
   */
  async getTopPerformingProducts(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.TOP_PERFORMING_PRODUCTS, {
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get underperforming products
   */
  async getUnderperformingProducts(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.UNDERPERFORMING, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  // ==================== PRODUCT ANALYTICS ====================

  /**
   * Get product analytics
   */
  async getProductAnalytics(
    storeId: string,
    productId: string,
    params?: AnalyticsParams
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PRODUCT, {
      storeId,
      productId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Get product conversion
   */
  async getProductConversion(
    storeId: string,
    productId: string,
    params?: AnalyticsParams
  ): Promise<ConversionMetrics> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PRODUCT_CONVERSION, {
      storeId,
      productId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ConversionMetrics>(urlWithParams);
  }

  /**
   * Get product rating analytics
   */
  async getProductRating(
    storeId: string,
    productId: string,
    params?: AnalyticsParams
  ): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PRODUCT_RATING, {
      storeId,
      productId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Get product quick stats
   */
  async getProductQuickStats(productId: string): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PRODUCT_QUICK_STATS, {
      productId,
    });
    return this.client.get(url);
  }

  // ==================== TOP PRODUCTS ====================

  /**
   * Get top products
   */
  async getTopProducts(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.TOP_PRODUCTS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get top products by views
   */
  async getTopProductsByViews(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.TOP_BY_VIEWS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  /**
   * Get top products by conversion
   */
  async getTopProductsByConversion(
    storeId: string,
    params?: TopProductsParams
  ): Promise<ProductPerformance[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.TOP_BY_CONVERSION, {
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<ProductPerformance[]>(urlWithParams);
  }

  // ==================== GLOBAL ANALYTICS ====================

  /**
   * Get top performing stores
   */
  async getTopPerformingStores(params?: { limit?: number }): Promise<any[]> {
    const urlWithParams = this.buildQueryUrl(
      API_ENDPOINTS.ANALYTICS.TOP_PERFORMING_STORES,
      params
    );
    return this.client.get<any[]>(urlWithParams);
  }

  /**
   * Get top stores by revenue
   */
  async getTopStoresByRevenue(params?: { limit?: number }): Promise<any[]> {
    const urlWithParams = this.buildQueryUrl(
      API_ENDPOINTS.ANALYTICS.TOP_STORES_BY_REVENUE,
      params
    );
    return this.client.get<any[]>(urlWithParams);
  }

  /**
   * Compare stores
   */
  async compareStores(params: CompareStoresParams): Promise<any> {
    return this.client.post(API_ENDPOINTS.ANALYTICS.STORE_COMPARISON, params);
  }

  /**
   * Compare products
   */
  async compareProducts(productIds: string[]): Promise<any> {
    return this.client.post(API_ENDPOINTS.ANALYTICS.PRODUCT_COMPARISON, {
      productIds,
    });
  }

  /**
   * Get batch product stats
   */
  async getBatchProductStats(productIds: string[]): Promise<any[]> {
    return this.client.post<any[]>(
      API_ENDPOINTS.ANALYTICS.BATCH_PRODUCT_STATS,
      {
        productIds,
      }
    );
  }

  // ==================== EVENTS ====================

  /**
   * Record analytics event
   */
  async recordEvent(storeId: string, event: AnalyticsEvent): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.RECORD_EVENT, { storeId });
    return this.client.post<void>(url, event);
  }

  /**
   * Record batch events
   */
  async recordEventsBatch(
    storeId: string,
    events: AnalyticsEvent[]
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.RECORD_EVENTS_BATCH, {
      storeId,
    });
    return this.client.post<void>(url, { events });
  }

  // ==================== SYNC ====================

  /**
   * Sync product analytics
   */
  async syncProduct(productId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.SYNC_PRODUCT, { productId });
    return this.client.post<void>(url);
  }

  /**
   * Sync store analytics
   */
  async syncStore(storeId: string): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.SYNC_STORE, { storeId });
    return this.client.post<void>(url);
  }

  // ==================== SYSTEM ====================

  /**
   * Run aggregation
   */
  async runAggregation(params: any): Promise<any> {
    return this.client.post(API_ENDPOINTS.ANALYTICS.AGGREGATION, params);
  }

  /**
   * Get analytics health
   */
  async getHealth(): Promise<{ status: string }> {
    return this.client.get(API_ENDPOINTS.ANALYTICS.HEALTH);
  }

  /**
   * Get analytics stats
   */
  async getStats(): Promise<any> {
    return this.client.get(API_ENDPOINTS.ANALYTICS.STATS);
  }

  /**
   * Get aggregators list
   */
  async getAggregators(): Promise<string[]> {
    return this.client.get<string[]>(API_ENDPOINTS.ANALYTICS.AGGREGATORS);
  }

  /**
   * Get aggregator schema
   */
  async getAggregatorSchema(name: string): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.AGGREGATOR_SCHEMA, { name });
    return this.client.get(url);
  }
}

export const analyticsService = new AnalyticsService();
