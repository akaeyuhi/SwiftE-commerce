// src/modules/likes/likes.controller.ts
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
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { RecordEventInterceptor } from 'src/modules/analytics/interceptors/record-event.interceptor';
import { AnalyticsEventType } from 'src/modules/analytics/entities/analytics-event.entity';
import { RecordEvent } from 'src/common/decorators/record-event.decorator';

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
@UseGuards(JwtAuthGuard)
@UseInterceptors(RecordEventInterceptor) // interceptor reads @RecordEvent metadata
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  private assertOwnership(userId: string, reqUser: any) {
    if (!reqUser) throw new ForbiddenException('Not authenticated');
    if (reqUser.id !== userId && !reqUser.isSiteAdmin) {
      throw new ForbiddenException('Not authorized');
    }
  }

  @Post('/product:productId')
  @RecordEvent({
    eventType: AnalyticsEventType.LIKE,
    invokedOn: 'product',
    when: 'after',
    userId: 'userId',
    productId: 'params.productId',
  })
  async addProductLike(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: CreateLikeDto,
    @Req() req: any
  ) {
    this.assertOwnership(userId, req.user);
    const dto = { ...body, userId };
    return this.likesService.create(dto);
  }

  @Post('/store/:storeId')
  @RecordEvent({
    eventType: AnalyticsEventType.LIKE,
    invokedOn: 'store',
    when: 'after',
    userId: 'userId',
    productId: 'params.storeId',
  })
  async addStoreLike(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: CreateLikeDto,
    @Req() req: any
  ) {
    this.assertOwnership(userId, req.user);
    const dto = { ...body, userId };
    return this.likesService.create(dto);
  }

  @Delete(':id')
  @RecordEvent({
    eventType: AnalyticsEventType.UNLIKE,
    storeId: 'params.storeId',
    productId: 'params.productId',
    userId: 'userId',
  })
  async removeLike(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: any
  ) {
    this.assertOwnership(userId, req.user);
    await this.likesService.removeById(id);
    return { success: true };
  }

  @Get()
  async listLikes(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req: any
  ) {
    this.assertOwnership(userId, req.user);
    return this.likesService.listForUser(userId);
  }
}
