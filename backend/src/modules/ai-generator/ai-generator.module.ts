import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-generator.service';
import { AiGeneratorService } from './ai-generator.service';
import { AiController } from './ai-generator.controller';
import { HuggingFaceProvider } from './providers/hugging-face.provider';
import { OpenAiProvider } from './providers/open-ai.provider';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { AiAuditsModule } from 'src/modules/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai-logs/ai-logs.module';

/**
 * AiModule provider selection:
 * - set env AI_PROVIDER = 'hf' | 'openai'
 */
@Module({
  imports: [NestHttpModule, AiAuditsModule, AiLogsModule],
  controllers: [AiController],
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
  exports: [AiGeneratorService],
})
export class AiGeneratorModule {}
