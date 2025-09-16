import { forwardRef, Module } from '@nestjs/common';
import { PredictorService } from './predictor.service';
import { PredictorRepository } from './predictor.repository';
import { DataSource } from 'typeorm';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';

@Module({
  imports: [HttpModule, forwardRef(() => AnalyticsModule)],
  providers: [
    PredictorService,
    {
      provide: PredictorRepository,
      useFactory: (dataSource: DataSource) =>
        new PredictorRepository(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [PredictorService],
})
export class PredictorModule {}
