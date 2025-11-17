/* eslint-disable brace-style */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { BaseAiService } from 'src/common/abstracts/ai/base.ai.service';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import {
  AiPredictRow,
  AiPredictBatchRequest,
} from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { CaseTransformer } from 'src/common/utils/case-transformer.util';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';
import {
  PredictorRequestData,
  PredictorResponseData,
} from 'src/common/interfaces/ai/predictor.interface';
import { ConfigService } from '@nestjs/config';
import { AiPredictorPersistenceService } from './ai-predictor-persistence.service';

/**
 * AiPredictorService with CamelCase Conventions
 *
 * Features:
 * - Automatic snake_case ↔ camelCase transformation
 * - Feature vector caching (5-minute TTL)
 * - Batch processing with chunking
 * - Comprehensive error handling
 * - Performance optimization
 */
import { IAiPredictorService } from '../contracts/ai-predictor.service.contract';
import { AiPredictorFeatureService } from 'src/modules/ai/ai-predictor/services/ai-predictor-feature.service';
import {
  ErrorResult,
  PredictionResult,
} from 'src/modules/ai/ai-predictor/types';
@Injectable()
export class AiPredictorService
  extends BaseAiService<PredictorRequestData, PredictorResponseData>
  implements IAiPredictorService
{
  private readonly predictorUrl: string;
  private readonly authToken?: string;
  private readonly chunkSize: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly aiLogsService: AiLogsService,
    private readonly aiAuditService: AiAuditService,
    private readonly persistenceService: AiPredictorPersistenceService,
    private readonly featureService: AiPredictorFeatureService
  ) {
    super();

    this.predictorUrl = this.configService.get<string>(
      'PREDICTOR_URL',
      'http://predictor:8080'
    );
    this.authToken = this.configService.get<string>('PREDICTOR_AUTH_TOKEN');
    this.chunkSize = parseInt(
      this.configService.get<string>('PREDICTOR_CHUNK_SIZE') ?? '50'
    );
  }

  protected validateRequest(
    request: AiServiceRequest<PredictorRequestData>
  ): void {
    if (!request.data?.items?.length) {
      throw new Error('Items array is required and cannot be empty');
    }

    if (request.data.items.length > 1000) {
      throw new Error(
        'Cannot process more than 1000 items in a single request'
      );
    }

    for (const item of request.data.items) {
      if (typeof item === 'string') continue;

      if (typeof item === 'object') {
        const obj = item as any;
        if (!obj.productId && !obj.features) {
          throw new Error(
            'Each item must have either productId or pre-built features'
          );
        }
      }
    }
  }

  protected async processRequest(
    request: AiServiceRequest<PredictorRequestData>
  ): Promise<AiServiceResponse<PredictorResponseData>> {
    const startTime = Date.now();

    try {
      const [predictions] = await this.predict(
        request.data.items,
        request.data.modelVersion,
        request.userId,
        request.storeId
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        text: `Processed ${predictions.length} predictions`,
        result: {
          predictions: predictions as any,
          modelVersion: request.data.modelVersion,
          processingTime,
        },
        feature: request.feature,
        provider: 'predictor',
        model: request.data.modelVersion,
        usage: {
          totalTokens: 0,
        },
        finishReason: '',
      };
    } catch (error) {
      this.logger.error('Predictor request processing failed:', error);
      throw error;
    }
  }

  protected async logUsage(
    request: AiServiceRequest<PredictorRequestData>,
    response: AiServiceResponse<PredictorResponseData>
  ): Promise<void> {
    await this.aiLogsService.record({
      userId: request.userId,
      storeId: request.storeId,
      feature: request.feature,
      prompt: null,
      details: {
        itemCount: request.data.items.length,
        modelVersion: request.data.modelVersion,
        processingTime: response.result?.processingTime,
        success: response.success,
        error: response.error,
        predictionsCount: response.result?.predictions?.length || 0,
      },
    });
  }

  protected async auditRequest(
    request: AiServiceRequest<PredictorRequestData>,
    response: AiServiceResponse<PredictorResponseData>
  ): Promise<void> {
    await this.aiAuditService.storeEncryptedResponse({
      feature: request.feature,
      provider: 'predictor',
      model: request.data.modelVersion,
      rawResponse: response.result,
      userId: request.userId,
      storeId: request.storeId,
    });
  }

  /**
   * Internal batch prediction with automatic case transformation
   */
  async predict(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ) {
    const preparedItems =
      await this.featureService.preparePredictionItems(items);
    return this.predictBatchAndPersist(
      preparedItems,
      modelVersion,
      userId,
      contextStoreId
    );
  }

  public async predictBatchAndPersist(
    normalized: Array<AiPredictRow & { meta: any }>,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ): Promise<[PredictionResult[], ErrorResult[]]> {
    const results: Array<PredictionResult> = [];
    const errors: Array<ErrorResult> = [];

    for (let i = 0; i < normalized.length; i += this.chunkSize) {
      const chunk = normalized.slice(i, i + this.chunkSize);

      try {
        const chunkResults = await this.processSingleChunk(
          chunk,
          i,
          modelVersion,
          userId,
          contextStoreId
        );
        results.push(...(chunkResults as any));
      } catch (error) {
        const errorResults = this.featureService.createErrorResults(
          chunk,
          i,
          error.message
        );
        errors.push(...errorResults);
      }
    }

    return [results, errors];
  }

  private async processSingleChunk(
    chunk: Array<AiPredictRow & { meta: any }>,
    startIndex: number,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ) {
    // Transform features to snake_case for predictor API
    const payload: AiPredictBatchRequest = {
      rows: chunk.map((item) => ({
        productId: item.productId,
        storeId: item.storeId,
        features: CaseTransformer.transformKeysToSnake(item.features),
      })),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['X-Internal-Token'] = this.authToken;
    }

    const response = await lastValueFrom(
      this.httpService.post<{ results: any[] }>(this.predictorUrl, payload, {
        headers,
        timeout: this.requestTimeout,
      })
    );

    // Transform response back to camelCase
    const transformedData = CaseTransformer.transformKeysToCamel(response.data);
    const predictions = transformedData?.results || [];

    await this.persistenceService.storeChunkResult(
      chunk,
      response,
      userId,
      contextStoreId
    );

    return this.persistenceService.formatChunkResults(
      chunk,
      predictions,
      startIndex
    );
  }

  async healthCheck() {
    try {
      const testPayload = {
        rows: [
          {
            productId: 'test',
            features: CaseTransformer.transformKeysToSnake({ test: 1 }),
          },
        ],
      };

      const response = await lastValueFrom(
        this.httpService.post(this.predictorUrl, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { 'X-Internal-Token': this.authToken }),
          },
          timeout: 5000,
        })
      );

      return {
        healthy: true,
        url: this.predictorUrl,
        responseTime: Date.now(),
        status: response.status,
      };
    } catch (error) {
      return {
        healthy: false,
        url: this.predictorUrl,
        error: error.message,
      };
    }
  }
}
