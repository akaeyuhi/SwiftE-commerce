export interface PredictDemandRequest {
  productId: string;
  features: {
    sales_7d: number;
    inventory_qty: number;
    views_7d: number;
    [key: string]: number;
  };
}

export interface DemandPrediction {
  productId: string;
  predictedDemand: number;
  stockoutRisk: 'low' | 'medium' | 'high';
  recommendedReorder: number;
  confidence: number;
}

export interface BatchPredictRequest {
  predictions: PredictDemandRequest[];
}

export interface TrendingProduct {
  productId: string;
  name: string;
  trendScore: number;
  predictedGrowth: number;
}

export interface PredictorStats {
  totalPredictions: number;
  accuracy: number;
  averageConfidence: number;
}

export interface ModelComparison {
  models: Array<{
    name: string;
    accuracy: number;
    speed: number;
    version: string;
  }>;
}
