/* eslint-disable brace-style */
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PREDICTOR_SERVICE } from 'src/common/constants/services';
import { AiPredictRow } from 'src/modules/ai/ai-predictor/dto/ai-predict.dto';
import { firstValueFrom, timeout } from 'rxjs';
import { CaseTransformer } from 'src/common/utils/case-transformer.util';
import { AiPredictorPersistenceService } from './ai-predictor-persistence.service';
import { IAiPredictorService } from '../contracts/ai-predictor.service.contract';
import { ConfigService } from '@nestjs/config';
import { AiPredictorFeatureService } from 'src/modules/ai/ai-predictor/services/ai-predictor-feature.service';
import {
  AiServiceRequest,
  AiServiceResponse,
} from 'src/common/interfaces/ai/ai.interface';
import {
  PredictorRequestData,
  PredictorResponseData,
} from 'src/common/interfaces/ai/predictor.interface';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import {
  ErrorResult,
  PredictionResult,
} from 'src/modules/ai/ai-predictor/types';

@Injectable()
export class AiPredictorRabbitMQService
  implements IAiPredictorService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AiPredictorRabbitMQService.name);
  private readonly chunkSize: number;

  constructor(
    @Inject(PREDICTOR_SERVICE) private readonly client: ClientProxy,
    private readonly configService: ConfigService,
    private readonly persistenceService: AiPredictorPersistenceService,
    private readonly featureService: AiPredictorFeatureService,
    private readonly aiLogsService: AiLogsService,
    private readonly aiAuditService: AiAuditService
  ) {
    this.chunkSize = parseInt(
      this.configService.get<string>('PREDICTOR_CHUNK_SIZE') ?? '50'
    );
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
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

  private validateItems(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException(
        'Items array is required and cannot be empty'
      );
    }

    if (items.length > 1000) {
      throw new BadRequestException(
        'Cannot process more than 1000 items in a single request'
      );
    }

    for (const item of items) {
      if (typeof item === 'string') continue;

      if (typeof item === 'object') {
        const obj = item as any;
        if (!obj.productId && !obj.features) {
          throw new BadRequestException(
            'Each item must have either productId or pre-built features'
          );
        }
      }
    }
  }

  async predict(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    userId?: string,
    contextStoreId?: string,
    modelVersion?: string
  ) {
    this.validateItems(items);
    const preparedItems =
      await this.featureService.preparePredictionItems(items);

    return this.predictBatchAndPersist(
      preparedItems,
      modelVersion,
      userId,
      contextStoreId
    );
  }

  async processSingleChunk(
    chunk: Array<AiPredictRow & { meta: any }>,
    startIndex: number,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ) {
    const payload = {
      rows: chunk.map((item) => ({
        productId: item.productId,
        storeId: item.storeId,
        features: CaseTransformer.transformKeysToSnake(item.features),
      })),
    };

    const preparedPayload = CaseTransformer.transformKeysToSnake(payload);

    const result = this.client
      .send<PredictorResponseData>('predict', preparedPayload)
      .pipe(timeout(10000));
    const response = await firstValueFrom(result);

    // Transform response back to camelCase
    const transformedData = CaseTransformer.transformKeysToCamel(response);
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

  async predictBatchAndPersist(
    normalized: Array<AiPredictRow & { meta: any }>,
    modelVersion?: string,
    userId?: string,
    contextStoreId?: string
  ): Promise<[PredictionResult[], ErrorResult[]]> {
    const results: Array<any> = [];
    const errors: Array<any> = [];

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
        results.push(...chunkResults);
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

  healthCheck(): Promise<any> {
    return this.client.send('health_check', {}).toPromise();
  }
}
