import { Global, Module } from '@nestjs/common';
import { Review } from 'src/entities/store/review.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsReviewsRepository } from 'src/modules/analytics-reviews/reviews-data.repository';
import { REVIEWS_REPOSITORY } from 'src/common/contracts/reviews.contract';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  providers: [
    AnalyticsReviewsRepository,
    { provide: REVIEWS_REPOSITORY, useExisting: AnalyticsReviewsRepository },
  ],
  exports: [REVIEWS_REPOSITORY],
})
export class AnalyticsReviewsModule {}
