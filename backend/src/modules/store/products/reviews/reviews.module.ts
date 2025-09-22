import { forwardRef, Module } from '@nestjs/common';
import { ReviewsService } from 'src/modules/store/products/reviews/reviews.service';
import { ReviewsController } from 'src/modules/store/products/reviews/reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from 'src/entities/store/review.entity';
import { ReviewsRepository } from 'src/modules/store/products/reviews/reviews.repository';
import { PolicyModule } from 'src/modules/auth/modules/policy/policy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), forwardRef(() => PolicyModule)],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsRepository, ReviewsService],
})
export class ReviewsModule {}
