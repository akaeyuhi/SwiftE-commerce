import { AggregationResult } from 'src/common/interfaces/infrastructure/analytics.interface';

export interface ProductMetrics extends AggregationResult {
  views: number;
  purchases: number;
  addToCarts: number;
  revenue: number;
}

export interface StoreMetrics extends ProductMetrics {
  checkouts: number;
}

export interface TopProductResult {
  productId: string;
  views: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}

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
  source: 'aggregatedStats' | 'rawEvents';
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
