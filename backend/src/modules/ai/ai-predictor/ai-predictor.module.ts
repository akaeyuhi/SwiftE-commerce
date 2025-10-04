import { Module } from '@nestjs/common';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AnalyticsModule,
    AiAuditsModule,
    AiLogsModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [AiPredictorController],
  providers: [AiPredictorService, AiPredictorRepository],
  exports: [AiPredictorService, AiPredictorRepository],
})
export class AiPredictorModule {}
