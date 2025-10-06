export interface StatsFilter {
  storeId?: string;
  productId?: string;
  modelVersion?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface FeatureVector {
  sales7d: number;
  sales14d: number;
  sales30d: number;
  sales7dPerDay: number;
  sales30dPerDay: number;
  salesRatio7To30: number;
  views7d: number;
  views30d: number;
  addToCarts7d: number;
  viewToPurchase7d: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgRating: number;
  ratingCount: number;
  inventoryQty: number;
  daysSinceRestock: number;
  dayOfWeek: number;
  isWeekend: number;
  storeViews7d: number;
  storePurchases7d: number;
}

export interface ChunkResult {
  index: number;
  score: number;
  label: string;
  productId: string;
  storeId: string;
  features: Record<string, any>;
  rawPrediction: string | null;
}

export interface ErrorResult extends ChunkResult {
  error: string;
}
