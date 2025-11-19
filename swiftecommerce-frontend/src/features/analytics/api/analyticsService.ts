import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  AnalyticsEvent,
  AnalyticsParams,
  CompareStoresParams,
  FunnelAnalysis,
  PeriodComparison,
  ProductConversionMetrics,
  ProductQuickStats,
  StoreConversionMetrics,
  StoreQuickStats,
  TimeSeriesData,
  TopProductResult,
} from '../types/analytics.types';

export class AnalyticsService extends BaseService {
  // ================== STORE-LEVEL ANALYTICS ==================

  /**
   * Fetches quick, cached stats for a store.
   * @param storeId - The ID of the store.
   * @returns `StoreQuickStats` from denormalized columns on the Store entity.
   */
  async getStoreQuickStats(storeId: string): Promise<StoreQuickStats> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE_QUICK_STATS, {
      storeId,
    });
    return this.client.get(url);
  }

  /**
   * Computes detailed conversion metrics for a store over a period.
   * @param storeId - The ID of the store.
   * @param params - Optional date range (`from`, `to`).
   * @returns `StoreConversionMetrics` calculated from daily stats or raw events.
   */
  async getStoreConversionMetrics(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<StoreConversionMetrics> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.STORE_CONVERSION, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Retrieves revenue and order trends over a period.
   * @param storeId - The ID of the store.
   * @param params - Optional date range.
   * @returns An array of `TimeSeriesData`.
   */
  async getRevenueTrends(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<TimeSeriesData[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.REVENUE_TRENDS, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Retrieves sales data aggregated by category.
   * @param storeId - The ID of the store.
   * @param params - Optional date range.
   */
  async getCategorySales(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<{ name: string; revenue: number }[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.CATEGORY_SALES, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Retrieves top-performing products by conversion rate.
   * @param storeId - The ID of the store.
   * @param params - Optional date range and limit.
   */
  async getTopPerformingProducts(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<TopProductResult[]> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.TOP_PERFORMING_PRODUCTS, {
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Retrieves a sales funnel analysis.
   * @param storeId - The ID of the store.
   * @param params - Optional date range and productId.
   */
  async getFunnelAnalysis(
    storeId: string,
    params?: AnalyticsParams
  ): Promise<FunnelAnalysis> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.FUNNEL, { storeId });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  /**
   * Compares performance between two periods.
   * @param storeId - The ID of the store.
   * @param params - Date range for the current period. The previous period is calculated automatically.
   */
  async getPeriodComparison(
    storeId: string,
    params: AnalyticsParams
  ): Promise<PeriodComparison> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PERIOD_COMPARISON, {
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  // ================== PRODUCT-LEVEL ANALYTICS ==================

  /**
   * Fetches quick, cached stats for a product.
   * @param productId - The ID of the product.
   * @returns `ProductQuickStats` from denormalized columns on the Product entity.
   */
  async getProductQuickStats(productId: string): Promise<ProductQuickStats> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PRODUCT_QUICK_STATS, {
      productId,
    });
    return this.client.get(url);
  }

  /**
   * Computes detailed conversion metrics for a product over a period.
   * @param storeId - The ID of the store.
   * @param productId - The ID of the product.
   * @param params - Optional date range (`from`, `to`).
   * @returns `ProductConversionMetrics` calculated from daily stats or raw events.
   */
  async getProductConversionMetrics(
    storeId: string,
    productId: string,
    params?: AnalyticsParams
  ): Promise<ProductConversionMetrics> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.PRODUCT_CONVERSION, {
      storeId,
      productId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get(urlWithParams);
  }

  // ================== GLOBAL & COMPARISON ANALYTICS ==================

  /**
   * Fetches top-performing stores globally.
   * @param params - Optional limit.
   */
  async getTopPerformingStores(params?: {
    limit?: number;
  }): Promise<StoreQuickStats[]> {
    const urlWithParams = this.buildQueryUrl(
      API_ENDPOINTS.ANALYTICS.TOP_PERFORMING_STORES,
      params
    );
    return this.client.get(urlWithParams);
  }

  /**
   * Compares metrics across multiple stores.
   * @param params - `storeIds` and optional date range.
   */
  async compareStores(params: CompareStoresParams): Promise<any> {
    return this.client.post(API_ENDPOINTS.ANALYTICS.STORE_COMPARISON, params);
  }

  // ================== EVENT TRACKING ==================

  /**
   * Records a single analytics event.
   * @param storeId - The ID of the store where the event occurred.
   * @param event - The event payload.
   */
  async recordEvent(storeId: string, event: AnalyticsEvent): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.RECORD_EVENT, { storeId });
    return this.client.post(url, event);
  }

  /**
   * Records a batch of analytics events.
   * @param storeId - The ID of the store.
   * @param events - An array of event payloads.
   */
  async recordEventsBatch(
    storeId: string,
    events: AnalyticsEvent[]
  ): Promise<void> {
    const url = buildUrl(API_ENDPOINTS.ANALYTICS.RECORD_EVENTS_BATCH, {
      storeId,
    });
    return this.client.post(url, { events });
  }
}

export const analyticsService = new AnalyticsService();
