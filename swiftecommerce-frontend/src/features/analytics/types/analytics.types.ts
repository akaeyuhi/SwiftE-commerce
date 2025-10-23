export interface StoreAnalytics {
  storeId: string;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  conversionRate: number;
  period: {
    start: string;
    end: string;
  };
  timeseries?: TimeSeriesData[];
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  views: number;
}

export interface ConversionMetrics {
  views: number;
  addedToCart: number;
  checkoutStarted: number;
  completed: number;
  conversionRate: number;
  cartConversionRate: number;
  checkoutConversionRate: number;
}

export interface FunnelAnalysis {
  steps: Array<{
    name: string;
    count: number;
    percentage: number;
    dropoff: number;
  }>;
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
  current: StoreAnalytics;
  previous: StoreAnalytics;
  changes: {
    revenue: {
      value: number;
      percentage: number;
    };
    orders: {
      value: number;
      percentage: number;
    };
    conversionRate: {
      value: number;
      percentage: number;
    };
  };
}

export interface ProductPerformance {
  productId: string;
  name: string;
  revenue: number;
  sales: number;
  views: number;
  conversionRate: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface AnalyticsEvent {
  type: 'view' | 'add_to_cart' | 'checkout' | 'purchase' | 'review';
  userId?: string;
  productId?: string;
  storeId: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface BatchEventRequest {
  events: AnalyticsEvent[];
}

export interface RecordEventDto {
  eventType: string;
  productId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}
