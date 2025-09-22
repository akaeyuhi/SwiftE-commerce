import { Module } from '@nestjs/common';
import { AiPredictorService } from './ai-predictor.service';
import { AiPredictorController } from './ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai-logs/ai-logs.module';

@Module({
  imports: [AiAuditsModule, AiLogsModule],
  controllers: [AiPredictorController],
  providers: [AiPredictorService],
})
export class AiPredictorModule {}
