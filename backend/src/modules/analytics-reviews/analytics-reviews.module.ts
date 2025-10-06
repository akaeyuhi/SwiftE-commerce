import { Global, Module } from '@nestjs/common';
import { Review } from 'src/entities/store/review.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsReviewsRepository } from 'src/modules/analytics-reviews/reviews-data.repository';
import { IReviewsRepository } from 'src/common/contracts/reviews.contract';

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
