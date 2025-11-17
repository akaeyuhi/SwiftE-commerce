import { AiPredictRow } from '../dto/ai-predict.dto';
import {
  ErrorResult,
  PredictionResult,
} from 'src/modules/ai/ai-predictor/types';

export const IAiPredictorService = Symbol('AiPredictorService');

export interface IAiPredictorService {
  predict(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    userId?: string,
    contextStoreId?: string
  ): Promise<any>;

  predictBatchAndPersist(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ): Promise<[PredictionResult[], ErrorResult[]]>;

  healthCheck(): Promise<any>;
}
