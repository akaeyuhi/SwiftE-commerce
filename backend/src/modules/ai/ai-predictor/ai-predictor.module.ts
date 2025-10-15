import { Module } from '@nestjs/common';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, ProductVariant]),
    AnalyticsModule,
    AiAuditsModule,
    AiLogsModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [AiPredictorController],
  providers: [
    AiPredictorService,
    AiPredictorRepository,
    { provide: IInventoryService, useClass: AiInventoryService },
    { provide: IVariantService, useClass: AiVariantService },
    { provide: IVariantRepository, useClass: AiVariantRepository },
    { provide: IInventoryRepository, useClass: AiInventoryRepository },
  ],
  exports: [AiPredictorService, AiPredictorRepository],
})
export class AiPredictorModule {}
