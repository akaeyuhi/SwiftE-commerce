import {
  AiPredictResult,
  AiPredictRow,
} from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';

export interface PredictionQueryOptions {
  limit?: number;
  offset?: number;
  modelVersion?: string;
  scoreThreshold?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PredictionStatsResult {
  totalPredictions: number;
  averageScore: number;
  scoreDistribution: {
    low: number; // score < 0.4
    medium: number; // 0.4 <= score < 0.7
    high: number; // score >= 0.7
  };
  byModelVersion: Record<string, number>;
  byScope: Record<string, number>;
  dailyBreakdown: Array<{ date: string; count: number; avgScore: number }>;
}

export interface PredictorRequestData {
  items: Array<string | { productId: string; storeId?: string } | AiPredictRow>;
  modelVersion?: string;
  userId?: string;
  storeId?: string;
}

export interface PredictorResponseData {
  predictions: Array<
    AiPredictResult & {
      productId?: string;
      storeId?: string;
      features?: Record<string, number>;
      rawPrediction?: any;
      error?: string;
    }
  >;
  modelVersion?: string;
  processingTime: number;
}
