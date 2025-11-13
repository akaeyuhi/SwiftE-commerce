import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';
import { AiPredictRow } from '../dto/ai-predict.dto';

export const IAiPredictorService = Symbol('AiPredictorService');

export interface IAiPredictorService {
  predict(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ): Promise<any>;

  predictBatchAndPersist(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string
  ): Promise<Array<{ predictorStat: AiPredictorStat; prediction: any }>>;

  healthCheck(): Promise<any>;
}
