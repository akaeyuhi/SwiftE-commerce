import { forwardRef, Module } from '@nestjs/common';
import { AiPredictorService } from 'src/modules/ai/ai-predictor/ai-predictor.service';
import { AiPredictorController } from 'src/modules/ai/ai-predictor/ai-predictor.controller';
import { AiAuditsModule } from 'src/modules/ai/ai-audit/ai-audit.module';
import { AiLogsModule } from 'src/modules/ai/ai-logs/ai-logs.module';
import { AiPredictorRepository } from 'src/modules/ai/ai-predictor/ai-predictor.repository';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { ReviewsModule } from 'src/modules/store/products/reviews/reviews.module';
import { PolicyModule } from 'src/modules/auth/modules/policy/policy.module';

@Module({
  imports: [
    AiAuditsModule,
    AiLogsModule,
    HttpModule,
    forwardRef(() => AnalyticsModule),
    ReviewsModule,
    PolicyModule,
  ],
  controllers: [AiPredictorController],
  providers: [AiPredictorService, AiPredictorRepository],
  exports: [AiPredictorService],
})
export class AiPredictorModule {}
