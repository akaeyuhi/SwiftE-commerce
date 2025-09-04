import { Controller, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Review } from 'src/entities/review.entity';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class ReviewsController extends BaseController<
  Review,
  CreateReviewDto,
  UpdateReviewDto
> {
  constructor(private readonly reviewsService: ReviewsService) {
    super(reviewsService);
  }
}
