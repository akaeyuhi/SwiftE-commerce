import { BaseService } from '@/lib/api/BaseService';
import { API_ENDPOINTS, buildUrl } from '@/config/api.config';
import {
  BatchPredictRequest,
  ModelComparison,
  PredictDemandRequest,
  PredictionResponse,
  PredictorStats,
  TrendingProduct,
} from '@/features/ai/types/ai-predictor.types.ts';

export class AIPredictorService extends BaseService {
  /**
   * Build features for prediction
   */
  async buildFeatures(storeId: string, productId: string): Promise<any> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.BUILD_FEATURES, {
      storesId: storeId,
      productId,
    });
    return this.client.get(url);
  }

  /**
   * Predict demand for single product
   */
  async predictSingle(
    storeId: string,
    data: PredictDemandRequest
  ): Promise<PredictionResponse> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.PREDICT_SINGLE, {
      storesId: storeId,
    });
    return this.client.post<PredictionResponse>(url, data);
  }

  /**
   * Predict demand for multiple products (batch)
   */
  async predictBatch(
    storeId: string,
    data: BatchPredictRequest
  ): Promise<PredictionResponse[]> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.PREDICT_BATCH, {
      storesId: storeId,
    });
    return this.client.post<PredictionResponse[]>(url, data);
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(
    storeId: string,
    params?: { limit?: number; period?: string }
  ): Promise<TrendingProduct[]> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.TRENDING, {
      storesId: storeId,
      storeId,
    });
    const urlWithParams = this.buildQueryUrl(url, params);
    return this.client.get<TrendingProduct[]>(urlWithParams);
  }

  /**
   * Get predictor statistics
   */
  async getPredictorStats(storeId: string): Promise<PredictorStats> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.STATS, {
      storesId: storeId,
      storeId,
    });
    return this.client.get<PredictorStats>(url);
  }

  /**
   * Get health status
   */
  async getHealth(storeId: string): Promise<{
    status: string;
    modelVersion: string;
  }> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.HEALTH, {
      storesId: storeId,
    });
    return this.client.get(url);
  }

  /**
   * Get model comparison
   */
  async getModelComparison(storeId: string): Promise<ModelComparison> {
    const url = buildUrl(API_ENDPOINTS.AI_PREDICTOR.MODEL_COMPARISON, {
      storesId: storeId,
    });
    return this.client.get<ModelComparison>(url);
  }
}

export const aiPredictorService = new AIPredictorService();
