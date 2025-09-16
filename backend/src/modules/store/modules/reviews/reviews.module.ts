import { Module } from '@nestjs/common';
import { ReviewsService } from 'src/modules/store/modules/reviews/reviews.service';
import { ReviewsController } from 'src/modules/store/modules/reviews/reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from 'src/entities/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
