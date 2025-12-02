import { Injectable, Logger } from '@nestjs/common';
import { AiPredictRow } from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { ChunkResult, ErrorResult } from 'src/modules/ai/ai-predictor/types';

@Injectable()
export class AiPredictorPersistenceService {
  private readonly logger = new Logger(AiPredictorPersistenceService.name);

  constructor(
    private aiLogsService: AiLogsService,
    private aiAuditService: AiAuditService
  ) {}

  public async storeChunkResult(
    chunk: AiPredictRow[],
    response: any,
    userId?: string,
    storeId?: string
  ): Promise<void> {
    try {
      await this.aiLogsService.record({
        userId,
        storeId,
        feature: 'predictor',
        prompt: null,
        details: {
          requestRowsCount: chunk.length,
          requestSample: chunk[0] ? { productId: chunk[0].productId } : null,
        },
      });
    } catch (err) {
      this.logger.warn(
        'AiLogs.record failed for predictor: ' + (err as any)?.message
      );
    }

    try {
      await this.aiAuditService.storeEncryptedResponse({
        feature: 'predictor',
        provider: 'predictor',
        model: undefined,
        rawResponse: response,
        userId: userId || null,
        storeId: storeId || null,
      });
    } catch (err) {
      this.logger.warn(
        'AiAudit.storeEncryptedResponse failed for predictor: ' +
          (err as any)?.message
      );
    }
  }

  public formatChunkResults(
    chunk: Array<AiPredictRow & { meta: any }>,
    predictions: any[],
    startIndex: number
  ): Array<ChunkResult | ErrorResult> {
    return chunk.map((item, chunkIndex) => {
      const globalIndex = startIndex + chunkIndex;
      const buildError = (item as any).__buildError;

      if (buildError) {
        return {
          index: globalIndex,
          score: NaN,
          label: 'error',
          productId: item.meta.productId,
          storeId: item.meta.storeId,
          features: item.features,
          history: item.history,
          rawPrediction: null,
          error: `feature_build_error: ${buildError}`,
        };
      }

      const prediction = predictions[chunkIndex];
      if (!prediction) {
        return {
          index: globalIndex,
          score: NaN,
          label: 'no_prediction',
          productId: item.meta.productId,
          storeId: item.meta.storeId,
          features: item.features,
          history: item.history,
          rawPrediction: null,
          error: 'no_prediction_returned',
        };
      }

      const score = this.normalizeScore(
        prediction.score ?? prediction.probability ?? prediction.value ?? 0
      );

      const label =
        prediction.label ??
        (score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low');

      return {
        index: globalIndex,
        score,
        label,
        productId: item.meta.productId,
        forecastP90: prediction.forecastP90,
        forecastP50: prediction.forecastP50,
        confidence: prediction.modelConfidence,
        daysUntilStockout: prediction.daysUntilStockout,
        storeId: item.meta.storeId,
        history: item.history,
        features: item.features,
        rawPrediction: prediction,
      };
    });
  }

  private normalizeScore(score: any): number {
    const numScore = Number(score);
    if (!Number.isFinite(numScore)) return 0;
    return Math.max(0, Math.min(1, numScore));
  }
}
