// ================== API Payloads & Parameters ==================

export type TimePeriod = 'day' | 'week' | 'month' | 'year';

export interface AnalyticsParams {
  from?: string;
  to?: string;
  productId?: string;
  includeTimeseries?: boolean;
  limit?: number;
  period?: TimePeriod;
}

export interface TopProductsParams {
  limit?: number;
  period?: TimePeriod;
  category?: string;
}

export interface CompareStoresParams {
  storeIds: string[];
  from?: string;
  to?: string;
  metrics?: string[];
}

export enum AnalyticsEventType {
  VIEW = 'view',
  LIKE = 'like',
  UNLIKE = 'unlike',
  ADD_TO_CART = 'addToCart',
  PURCHASE = 'purchase',
  CHECKOUT = 'checkout',
  CLICK = 'click',
  CUSTOM = 'custom',
}

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  productId?: string;
  userId?: string;
  storeId?: string;
  value?: number;
  invokedOn?: 'store' | 'product';
  meta?: Record<string, any>;
}

// ================== API Response Types (based on backend services) ==================

/**
 * From QuickStatsService - uses denormalized columns on Product/Store entities.
 */
export interface StoreQuickStats {
  storeId: string;
  name: string;
  productCount: number;
  followerCount: number;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  source: 'cached';
}

/**
 * From QuickStatsService - uses denormalized columns on Product/Store entities.
 */
export interface ProductQuickStats {
  productId: string;
  name: string;
  viewCount: number;
  likeCount: number;
  totalSales: number;
  reviewCount: number;
  averageRating: number;
  conversionRate: number;
  source: 'cached';
}

/**
 * From ConversionAnalyticsService - calculated from daily stats or raw events.
 */
export interface StoreConversionMetrics {
  storeId: string;
  views: number;
  purchases: number;
  addToCarts: number;
  revenue: number;
  checkouts: number;
  conversionRate: number;
  addToCartRate: number;
  checkoutRate: number;
  source: 'aggregatedStats' | 'rawEvents' | 'hybridCached';
}

/**
 * From ConversionAnalyticsService - calculated from daily stats or raw events.
 */
export interface ProductConversionMetrics {
  productId: string;
  views: number;
  purchases: number;
  addToCarts: number;
  revenue: number;
  conversionRate: number;
  addToCartRate: number;
  source: 'aggregatedStats' | 'rawEvents' | 'hybridCached';
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  views: number;
}

export interface TopProductResult {
  productId: string;
  name: string;
  views: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}

export interface FunnelAnalysis {
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

export interface CohortAnalysis {
  cohorts: Array<{
    cohortDate: string;
    userCount: number;
    retention: Record<string, number>;
  }>;
}

export interface UserJourney {
  averageTimeToConversion: number;
  commonPaths: Array<{
    path: string[];
    count: number;
    conversionRate: number;
  }>;
}

export interface PeriodComparison {
  currentPeriod: { from: string; to: string; metrics: any };
  previousPeriod: { from: string; to: string; metrics: any };
  changes: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
}
