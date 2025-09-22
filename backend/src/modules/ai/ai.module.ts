import { Module } from '@nestjs/common';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiGeneratorModule } from 'src/modules/ai/ai-generator/ai-generator.module';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import { AiGeneratorService } from 'src/modules/ai/ai-generator/ai-generator.service';
import { AiPredictorModule } from 'src/modules/ai/ai-predictor/ai-predictor.module';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';

@Module({
  imports: [AiAuditsModule, AiLogsModule, AiGeneratorModule, AiPredictorModule],
  exports: [
    AiAuditService,
    AiLogsService,
    AiGeneratorService,
    AiPredictorService,
  ],
})
export class AiModule {}
