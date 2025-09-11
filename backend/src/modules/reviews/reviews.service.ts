import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { Review } from 'src/entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsRepository } from 'src/modules/reviews/reviews.repository';
import { ReviewDto } from 'src/modules/reviews/dto/review.dto';

/**
 * ReviewsService
 *
 * Lightweight service that extends BaseService and adds a couple of
 * convenience methods for common review queries.
 *
 * It uses the BaseRepository convenience methods (createEntity, findById, find, updateEntity, deleteById).
 */
@Injectable()
export class ReviewsService extends BaseService<
  Review,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewDto
> {
  constructor(private readonly reviewRepo: ReviewsRepository) {
    super(reviewRepo);
  }

  /**
   * List reviews for a given product, ordered newest-first.
   *
   * @param productId - id of the product
   * @returns array of Review entities
   */
  async findAllByProduct(productId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { product: { id: productId } as any },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * List reviews by a specific user, ordered newest-first.
   *
   * @param userId - id of the user
   * @returns array of Review entities
   */
  async findAllByUser(userId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { user: { id: userId } as any },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a review wiring relation ids (product & user).
   *
   * If `dto.userId` is absent you may pass `authorId` (for example taken from req.user).
   * Uses repository.createEntity() to leverage BaseRepository.save behavior.
   *
   * @param dto - CreateReviewDto
   * @param authorId - optional explicit userId (overrides dto.userId when provided)
   * @returns created Review entity (or mapped TransferDto if mapper present)
   */
  async createWithRelations(
    dto: CreateReviewDto,
    authorId?: string
  ): Promise<Review | ReviewDto> {
    const entityPartial = {
      product: { id: dto.productId },
      user: dto.userId ? { id: dto.userId } : undefined,
      rating: dto.rating,
      comment: dto.comment,
    };

    if (authorId) {
      entityPartial.user = { id: authorId };
    }

    return await this.repository.createEntity(entityPartial);
  }
}
