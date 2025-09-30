/**
 * DTOs used by AiPredictorService
 */
export interface AiPredictRow {
  productId?: string | null;
  storeId?: string;
  features: Record<string, any>;
}

export interface AiPredictBatchRequest {
  rows: AiPredictRow[];
}

export interface AiPredictResult {
  index: number;
  score: number;
  label?: string;
  [key: string]: any;
}

