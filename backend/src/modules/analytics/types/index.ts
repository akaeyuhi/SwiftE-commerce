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
