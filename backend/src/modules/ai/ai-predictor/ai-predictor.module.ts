import { forwardRef, Module } from '@nestjs/common';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { ReviewsModule } from 'src/modules/products/reviews/reviews.module';
import { PolicyModule } from 'src/modules/auth/policy/policy.module';

@Module({
  imports: [
    forwardRef(() => AnalyticsModule),
    AiAuditsModule,
    AiLogsModule,
    HttpModule,
    ReviewsModule,
    PolicyModule,
  ],
  controllers: [AiPredictorController],
  providers: [AiPredictorService, AiPredictorRepository],
  exports: [AiPredictorService, AiPredictorRepository],
})
export class AiPredictorModule {}
