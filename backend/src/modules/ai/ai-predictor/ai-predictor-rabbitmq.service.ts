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
import { AiPredictorService } from './ai-predictor.service';
import { CaseTransformer } from 'src/common/utils/case-transformer.util';
import { AiPredictorRepository } from './ai-predictor.repository';
import { AiPredictorStat } from 'src/entities/ai/ai-predictor-stat.entity';

@Injectable()
export class AiPredictorRabbitMQService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AiPredictorRabbitMQService.name);

  constructor(
    @Inject(PREDICTOR_SERVICE) private readonly client: ClientProxy,
    private readonly predictorService: AiPredictorService,
    private readonly predictorRepo: AiPredictorRepository
  ) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
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
    >
  ) {
    this.validateItems(items);
    const preparedItems =
      await this.predictorService.preparePredictionItems(items);

    const payload = {
      rows: preparedItems.map((item) => ({
        productId: item.productId,
        storeId: item.storeId,
        features: CaseTransformer.transformKeysToSnake(item.features),
      })),
    };

    // Use 'send' for request-response pattern
    const result = this.client.send('predict', payload).pipe(timeout(10000));
    return firstValueFrom(result);
  }

  async predictBatchAndPersist(
    items: Array<
      string | { productId: string; storeId?: string } | AiPredictRow
    >,
    modelVersion?: string
  ): Promise<Array<{ predictorStat: AiPredictorStat; prediction: any }>> {
    const predictions = await this.predict(items);
    const persisted: Array<{
      predictorStat: AiPredictorStat;
      prediction: any;
    }> = [];

    for (const prediction of (predictions as any).results) {
      if (prediction.error) {
        this.logger.warn(
          `Skipping persist for product ${prediction.productId} due to error: ${prediction.error}`
        );
        continue;
      }

      try {
        const created = await this.predictorRepo.createEntity({
          scope: prediction.productId ? 'product' : 'store',
          productId: prediction.productId ?? null,
          storeId: prediction.storeId ?? null,
          features: prediction.features ?? {},
          prediction: prediction.rawPrediction ?? {
            score: prediction.score,
            label: prediction.label,
          },
          modelVersion: modelVersion ?? null,
        } as any);

        persisted.push({
          predictorStat: created as AiPredictorStat,
          prediction: prediction.rawPrediction ?? {
            score: prediction.score,
            label: prediction.label,
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to persist prediction for ${prediction.productId}: ${err?.message ?? err}`
        );
      }
    }

    return persisted;
  }
}
