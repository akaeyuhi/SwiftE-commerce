export interface HealthMetric {
  cached: number;
  actual: number;
  match: boolean;
}

export interface StoreHealthData {
  storeId: string;
  health: {
    productCount: HealthMetric;
    variantCount?: HealthMetric;
    categoryCount?: HealthMetric;
    orderCount?: HealthMetric;
    reviewCount?: HealthMetric;
  };
  needsRecalculation: boolean;
}

export interface StoreHealthResponse {
  status: number;
  data: StoreHealthData;
}
