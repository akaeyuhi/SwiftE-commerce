import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { Review } from 'src/entities/review.entity';
import { ReviewsRepository } from 'src/modules/reviews/reviews.repository';

@Injectable()
export class ReviewsService extends BaseService<Review> {
  constructor(private readonly reviewRepo: ReviewsRepository) {
    super(reviewRepo);
  }
}
