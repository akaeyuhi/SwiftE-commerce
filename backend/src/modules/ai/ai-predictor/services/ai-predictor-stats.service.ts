import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AiPredictorStatsService {
  constructor(private predictorRepo: AiPredictorRepository) {}

  async getTrendingProducts(
    storeId: string,
    options: {
      limit?: number;
      timeframe?: 'day' | 'week' | 'month';
      minScore?: number;
    } = {}
  ) {
    return this.predictorRepo.getTrendingProducts(storeId, options);
  }

  async getPredictionStats(
    filters: {
      storeId?: string;
      productId?: string;
      modelVersion?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    return this.predictorRepo.getPredictionStats(filters);
  }

  async getModelComparison(modelVersionA: string, modelVersionB: string) {
    const [statsA, statsB] = await Promise.all([
      this.predictorRepo.getPredictionStats({ modelVersion: modelVersionA }),
      this.predictorRepo.getPredictionStats({ modelVersion: modelVersionB }),
    ]);

    return {
      [modelVersionA]: statsA,
      [modelVersionB]: statsB,
    };
  }
}
