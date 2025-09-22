import { Module } from '@nestjs/common';
import { AiPredictorService } from './ai-predictor.service';
import { AiPredictorController } from './ai-predictor.controller';

@Module({
  controllers: [AiPredictorController],
  providers: [AiPredictorService],
})
export class AiPredictorModule {}
