import { AggregationResult } from 'common/interfaces/analytics.interface';
import { AnalyticsEventType } from 'entities/analytics-event.entity';

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
  source: 'aggregatedStats' | 'rawEvents' | 'hybridCached';
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

export interface ProductQuickStats {
  productId: string;
  name: string;
  viewCount: number;
  likeCount: number;
  totalSales: number;
  reviewCount: number;
  averageRating: number;
  conversionRate: number;
  source: 'cached' | 'hybrid-cached' | 'aggregated';
}

export interface StoreQuickStats {
  storeId: string;
  name: string;
  productCount: number;
  followerCount: number;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  source: 'cached' | 'hybrid-cached' | 'aggregated';
}

export interface EventUserJourney {
  userId: string;
  eventType: AnalyticsEventType;
  productId: string;
  createdAt: Date;
}

export interface TopPerformingStores {
  dateRange: { from?: string; to?: string };
  stores: Array<{
    rank: number;
    storeId: string;
    storeName: string;
    views: number;
    purchases: number;
    revenue: number;
    addToCarts: number;
    conversionRate: number;
    averageOrderValue: number;
  }>;
}
