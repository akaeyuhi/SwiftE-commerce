import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AiPredictorRabbitMQService } from './ai-predictor-rabbitmq.service';
import { BatchPredictDto } from './dto/predictor-request.dto';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

@Controller('ai/predictor-rabbitmq')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class AiPredictorRabbitMQController {
  static accessPolicies: AccessPolicies = {
    predictBatch: {
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
  };

  constructor(
    private readonly predictorRabbitMQService: AiPredictorRabbitMQService,
  ) {}

  @Post('predict/batch')
  async predictBatch(@Body() dto: BatchPredictDto) {
    let results;
    let processedItems = 0;

    if (dto.persist) {
      const persisted =
        await this.predictorRabbitMQService.predictBatchAndPersist(
          dto.items,
          dto.modelVersion,
        );
      results = persisted.map((p) => ({
        predictorStatId: p.predictorStat?.id,
        prediction: p.prediction,
        success: true,
      }));
      processedItems = persisted.length;
    } else {
      results = await this.predictorRabbitMQService.predict(dto.items);
      processedItems = (results as any)?.results?.length || 0;
    }

    return {
      success: true,
      data: {
        results,
        metadata: {
          totalItems: dto.items.length,
          processedItems,
          persisted: dto.persist || false,
          modelVersion: dto.modelVersion,
          processedAt: new Date().toISOString(),
        },
      },
    };
  }
}
