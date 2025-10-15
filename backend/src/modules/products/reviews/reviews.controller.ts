import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from 'src/modules/products/reviews/reviews.service';
import { CreateReviewDto } from 'src/modules/products/reviews/dto/create-review.dto';
import { UpdateReviewDto } from 'src/modules/products/reviews/dto/update-review.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Review } from 'src/entities/store/review.entity';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { ReviewDto } from 'src/modules/products/reviews/dto/review.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import { Request } from 'express';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';

/**
 * ReviewsController
 *
 * Routes:
 *  - GET    /stores/:storeId/products/:productId/reviews  -> list reviews for product
 *  - GET    /stores/:storeId/products/:productId/reviews/:id -> get review
 *  - POST   /stores/:storeId/products/:productId/reviews/create  -> create review (auth)
 *  - POST   /stores/:storeId/products/:productId/reviews/  -> create review (admin)
 *  - PUT    /stores/:storeId/products/:productId/reviews/:id -> update review (store-admin)
 *  - DELETE /stores/:storeId/products/:productId/reviews/:id -> delete review (store-admin)
 *
 * Notes:
 *  - For creation, the controller takes the authenticated user id from req.user and uses it as author.
 *  - accessPolicies let StoreRolesGuard decide per-route permissions.
 */
@Controller('stores/:storeId/products/:productId/reviews')
@UseGuards(JwtAuthGuard, AdminGuard, StoreRolesGuard)
export class ReviewsController extends BaseController<
  Review,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewDto
> {
  static accessPolicies: AccessPolicies = {
    createWithRelations: { requireAuthenticated: true },
    create: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: undefined,
    },
    update: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: undefined,
    },
    remove: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: undefined,
    },
  };

  constructor(private readonly reviewsService: ReviewsService) {
    super(reviewsService);
  }

  /**
   * Create a review for a product. Authenticated user becomes the review author.
   */
  @Post('create')
  async createWithRelations(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: Request
  ): Promise<Review | ReviewDto> {
    const authorId = (req as any).user?.id;
    const enriched = { ...dto, productId };
    return this.reviewsService.createWithRelations(enriched, authorId);
  }

  @Get()
  async findAllByProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string
  ): Promise<Review[]> {
    return this.reviewsService.findAllByProduct(productId);
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) reviewId: string,
    @Body() dto: UpdateReviewDto
  ): Promise<Review | ReviewDto> {
    return this.reviewsService.update(reviewId, dto);
  }
}
