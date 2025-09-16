/**
 * DTOs used by PredictorService
 */
export interface PredictRow {
  productId?: string | null;
  storeId?: string | null;
  features: Record<string, any>;
}

export interface PredictBatchRequest {
  rows: PredictRow[];
}

export interface PredictResult {
  index: number;
  score: number;
  label?: string;
  [key: string]: any;
}
