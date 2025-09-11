import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Review } from 'src/entities/review.entity';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ReviewDto } from './dto/review.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/auth/policy/policy.types';
import { Request } from 'express';
import { AdminRoles } from 'src/common/enums/admin.enum';

/**
 * ReviewsController
 *
 * Routes:
 *  - GET    /stores/:storeId/products/:productId/reviews  -> list reviews for product
 *  - GET    /stores/:storeId/products/:productId/reviews/:id -> get review
 *  - POST   /stores/:storeId/products/:productId/reviews  -> create review (auth)
 *  - PUT    /stores/:storeId/products/:productId/reviews/:id -> update review (store-admin)
 *  - DELETE /stores/:storeId/products/:productId/reviews/:id -> delete review (store-admin)
 *
 * Notes:
 *  - For creation, the controller takes the authenticated user id from req.user and uses it as author.
 *  - accessPolicies let StoreRolesGuard decide per-route permissions.
 */
@Controller('stores/:storeId/products/:productId/reviews')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class ReviewsController extends BaseController<
  Review,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewDto
> {
  static accessPolicies: AccessPolicies = {
    findAll: { requireAuthenticated: true, adminRole: AdminRoles.ADMIN },
    findOne: { requireAuthenticated: true },
    createWithRelations: { requireAuthenticated: true },
    create: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN],
      adminRole: AdminRoles.ADMIN,
    },
    update: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
    remove: { requireAuthenticated: true, storeRoles: [StoreRoles.ADMIN] },
  };

  constructor(private readonly reviewsService: ReviewsService) {
    super(reviewsService);
  }

  /**
   * Create a review for a product. Authenticated user becomes the review author.
   */
  @Post()
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
}
