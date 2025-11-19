export interface HealthMetric {
  cached: number;
  actual: number;
  match: boolean;
}

export interface StoreHealthResponse {
  storeId: string;
  storeName: string;
  healthScore: number;
  healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  checkedAt: Date;
  metrics: {
    productCount: HealthMetric;
    orderCount: HealthMetric;
    totalRevenue: HealthMetric;
    variantCount: HealthMetric;
    categoryCount: HealthMetric;
  };
  products: {
    total: number;
    withoutVariants: number;
    withoutCategory: number;
    totalVariants: number;
    avgVariantsPerProduct: number;
  };
  categories: {
    total: number;
    withProducts: number;
    empty: number;
    utilizationPercentage: number;
  };
  orders: {
    total: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  recommendations: Array<{
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    action: string;
  }>;
  needsRecalculation: boolean;
}
