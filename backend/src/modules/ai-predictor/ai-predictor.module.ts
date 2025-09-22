import { Module } from '@nestjs/common';
import { AiPredictorService } from './ai-predictor.service';
import { AiPredictorController } from './ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [AiAuditsModule, AiLogsModule, HttpModule],
  controllers: [AiPredictorController],
  providers: [AiPredictorService, AiPredictorRepository],
})
export class AiPredictorModule {}
