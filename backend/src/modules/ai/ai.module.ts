import { forwardRef, Module } from '@nestjs/common';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiGeneratorModule } from 'src/modules/ai/ai-generator/ai-generator.module';
import { AiAuditService } from 'src/modules/ai/ai-audit/ai-audit.service';
import { AiLogsService } from 'src/modules/ai/ai-logs/ai-logs.service';
import {
  AI_PROVIDER,
  AiGeneratorService,
} from 'src/modules/ai/ai-generator/ai-generator.service';
import { AiPredictorModule } from 'src/modules/ai/ai-predictor/ai-predictor.module';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { OpenAiProvider } from 'src/modules/ai/ai-generator/providers/open-ai.provider';
import { HuggingFaceProvider } from 'src/modules/ai/ai-generator/providers/hugging-face.provider';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { ReviewsModule } from 'src/modules/products/reviews/reviews.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => AnalyticsModule),
    ReviewsModule,
    AiAuditsModule,
    AiLogsModule,
    AiGeneratorModule,
    AiPredictorModule,
  ],
  providers: [
    AiAuditService,
    AiLogsService,
    OpenAiProvider,
    HuggingFaceProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (hf: HuggingFaceProvider, openai: OpenAiProvider) => {
        const sel = (process.env.AI_PROVIDER ?? 'hf').toLowerCase();
        if (sel === 'openai') return openai;
        return hf;
      },
      inject: [HuggingFaceProvider, OpenAiProvider],
    },
    AiGeneratorService,
    AiPredictorService,
  ],
  exports: [
    AiAuditService,
    AiLogsService,
    AiGeneratorService,
    AiPredictorService,
  ],
})
export class AiModule {}
