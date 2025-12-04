import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsReviewsRepository } from 'src/analytics-reviews/reviews-data.repository';
import { IReviewsRepository } from 'common/contracts/analytics.contract';
import { Review } from 'entities/read-only/review.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  providers: [
    AnalyticsReviewsRepository,
    { provide: IReviewsRepository, useClass: AnalyticsReviewsRepository },
  ],
  exports: [IReviewsRepository],
})
export class AnalyticsReviewsModule {}
