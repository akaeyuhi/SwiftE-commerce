import { AiPredictorPersistenceService } from './services/ai-predictor-persistence.service';
import { AiPredictorStatsController } from './controllers/ai-predictor-stats.controller';
import { Module } from '@nestjs/common';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/services/ai-predictor.service';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/controllers/ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  IInventoryRepository,
  IInventoryService,
  IVariantRepository,
  IVariantService,
} from 'src/common/contracts/ai-predictor.contract';
import { AiInventoryService } from 'src/modules/ai/ai-predictor/implementations/services/ai-inventory.service';
import { AiVariantRepository } from 'src/modules/ai/ai-predictor/implementations/repositories/ai-variant.repository';
import { AiInventoryRepository } from 'src/modules/ai/ai-predictor/implementations/repositories/ai-inventory.repository';
import { AiVariantService } from 'src/modules/ai/ai-predictor/implementations/services/ai-variant.service';
import { Inventory } from 'src/entities/store/product/inventory.entity';
import { ProductVariant } from 'src/entities/store/product/variant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from 'src/modules/rabbitmq/rabbitmq.module';
import { AiPredictorRabbitMQService } from 'src/modules/ai/ai-predictor/services/ai-predictor-rabbitmq.service';
import { IAiPredictorService } from './contracts/ai-predictor.service.contract';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, ProductVariant]),
    AnalyticsModule,
    AiAuditsModule,
    AiLogsModule,
    HttpModule,
    ConfigModule,
    RabbitMQModule,
  ],
  controllers: [AiPredictorController, AiPredictorStatsController],
  providers: [
    AiPredictorService,
    AiPredictorRepository,
    AiPredictorRabbitMQService,
    AiPredictorPersistenceService,
    {
      provide: IAiPredictorService,
      useFactory: (
        configService: ConfigService,
        httpService: AiPredictorService,
        rabbitmqService: AiPredictorRabbitMQService
      ) => {
        const transport = configService.get('PREDICTOR_TRANSPORT');
        return transport === 'rabbitmq' ? rabbitmqService : httpService;
      },
      inject: [ConfigService, AiPredictorService, AiPredictorRabbitMQService],
    },
    { provide: IInventoryService, useClass: AiInventoryService },
    { provide: IVariantService, useClass: AiVariantService },
    { provide: IVariantRepository, useClass: AiVariantRepository },
    { provide: IInventoryRepository, useClass: AiInventoryRepository },
  ],
  exports: [AiPredictorService, AiPredictorRepository, IAiPredictorService],
})
export class AiPredictorModule {}
