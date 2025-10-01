import { Module } from '@nestjs/common';
import { AI_PROVIDER } from 'src/modules/ai/ai-generator/ai-generator.service';
import { AiGeneratorService } from 'src/modules/ai/ai-generator/ai-generator.service';
import { AiGeneratorController } from 'src/modules/ai/ai-generator/ai-generator.controller';
import { HuggingFaceProvider } from 'src/modules/ai/ai-generator/providers/hugging-face.provider';
import { OpenAiProvider } from 'src/modules/ai/ai-generator/providers/open-ai.provider';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';

/**
 * AiModule provider selection:
 * - set env AI_PROVIDER = 'hf' | 'openai'
 */
@Module({
  imports: [NestHttpModule, AiAuditsModule, AiLogsModule],
  controllers: [AiGeneratorController],
  providers: [
    HuggingFaceProvider,
    OpenAiProvider,
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
  ],
  exports: [AiGeneratorService, HuggingFaceProvider, OpenAiProvider],
})
export class AiGeneratorModule {}
