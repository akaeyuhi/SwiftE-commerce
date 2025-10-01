import { Module } from '@nestjs/common';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { REVIEWS_REPOSITORY } from 'src/common/contracts/reviews.contract';
import { AiReviewsRepository } from 'src/modules/ai/ai-predictor/repositories/reviews-data.repository';

@Module({
  imports: [AnalyticsModule, AiAuditsModule, AiLogsModule, HttpModule],
  controllers: [AiPredictorController],
  providers: [
    AiPredictorService,
    AiPredictorRepository,
    { provide: REVIEWS_REPOSITORY, useExisting: AiReviewsRepository },
  ],
  exports: [AiPredictorService, AiPredictorRepository],
})
export class AiPredictorModule {}
