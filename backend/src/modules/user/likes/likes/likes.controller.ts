import {
  Controller,
  UseGuards,
  Post,
  Delete,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  Req,
  ForbiddenException,
  UseInterceptors,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { RecordEvent } from 'src/common/decorators/record-event.decorator';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { EntityOwner } from 'src/common/decorators/entity-owner.decorator';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';

/**
 * LikesController
 *
 * POST   /users/:userId/likes        -> add like (body: { productId? storeId? })
 * DELETE /users/:userId/likes/:id   -> remove like
 * GET    /users/:userId/likes       -> list likes
 *
 * Requires authenticated user; ensures :userId === request.user.id
 */
@Controller('users/:userId/likes')
@UseGuards(JwtAuthGuard, AdminGuard, EntityOwnerGuard)
@UseInterceptors(RecordEventInterceptor)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  private assertOwnership(userId: string, reqUser: any) {
    if (!reqUser) throw new ForbiddenException('Not authenticated');
    if (reqUser.id !== userId && !reqUser.isSiteAdmin) {
      throw new ForbiddenException('Not authorized');
    }
  }

  @Post('/product/:productId')
  @RecordEvent({
    eventType: AnalyticsEventType.LIKE,
    invokedOn: 'product',
    when: 'after',
    userId: 'params.userId',
    productId: 'params.productId',
  })
  async addProductLike(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() body: CreateLikeDto,
    @Req() req: any
  ) {
    this.assertOwnership(userId, req.user);
    const dto = { ...body, userId, productId };
    return this.likesService.create(dto);
  }

  @Post('/store/:storeId')
  @RecordEvent({
    eventType: AnalyticsEventType.LIKE,
    invokedOn: 'store',
    when: 'after',
    userId: 'params.userId',
    productId: 'params.storeId',
  })
  async addStoreLike(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() body: CreateLikeDto,
    @Req() req: any
  ) {
    this.assertOwnership(userId, req.user);
    const dto = { ...body, userId, storeId };
    return this.likesService.create(dto);
  }

  @Delete(':id')
  @RecordEvent({
    eventType: AnalyticsEventType.UNLIKE,
    storeId: 'params.storeId',
    productId: 'params.productId',
    userId: 'params.userId',
  })
  @EntityOwner({
    serviceToken: LikesService,
    idParam: 'id',
    allowMissingEntity: false,
  })
  async removeLike(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ) {
    await this.likesService.removeById(id);
    return { success: true };
  }

  @Get()
  @EntityOwner({
    allowMissingEntity: true,
  })
  async listLikes(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.likesService.listForUser(userId);
  }
}
