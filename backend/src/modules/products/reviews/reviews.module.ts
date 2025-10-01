import { Module } from '@nestjs/common';
import { ReviewsService } from 'src/modules/products/reviews/reviews.service';
import { ReviewsController } from 'src/modules/products/reviews/reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from 'src/entities/store/review.entity';
import { ReviewsRepository } from 'src/modules/products/reviews/reviews.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsRepository, ReviewsService],
})
export class ReviewsModule {}
