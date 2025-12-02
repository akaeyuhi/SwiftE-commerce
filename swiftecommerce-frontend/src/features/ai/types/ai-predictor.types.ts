export interface PredictDemandRequest {
  productId: string;
  storeId: string;
  features: {
    sales_7d: number;
    inventory_qty: number;
    views_7d: number;
    [key: string]: number;
  };
}

export interface BatchPredictRequest {
  predictions: PredictDemandRequest[];
}

export interface StockPredictionFeatures {
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

export interface DailyStat {
  date: string;
  purchases: number;
  views: number;
  revenue: number;
  inventoryQty: number;
}

export interface RawPrediction {
  index: number;
  score: number;
  label: 'low' | 'medium' | 'high' | 'critical';
  productId: string | null;
  storeId: string | null;
}

export interface ProductPrediction {
  index: number;
  score: number;
  label: 'low' | 'medium' | 'high' | 'critical';
  productId: string;
  storeId: string;
  features: StockPredictionFeatures;
  history?: DailyStat[];
  forecastP50?: number;
  forecastP90?: number;
  confidence: number;
  rawPrediction: RawPrediction;
  daysUntilStockout: number;
}

export interface PredictionMetadata {
  processedAt: string;
  userId: string;
}

export interface PredictionResponse {
  data: {
    prediction: ProductPrediction[];
    metadata: PredictionMetadata;
  };
  success: boolean;
}

export interface NormalizedPrediction {
  productId: string;
  storeId: string;
  stockoutRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-1
  riskPercentage: number; // 0-100
  confidence: number; // 0-100
  inventoryLevel: number;
  predictedDemand: number; // sales30dPerDay or forecast_p50
  peakDemand?: number; // forecast_p90
  recommendedReorder: number;
  daysUntilStockout: number | null;
  features?: StockPredictionFeatures;
  history?: DailyStat[]; // Added history support
  processedAt: Date;
}
