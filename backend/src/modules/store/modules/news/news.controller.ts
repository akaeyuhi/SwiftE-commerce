import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NewsService } from 'src/modules/store/modules/news/news.service';
import { CreateNewsDto } from 'src/modules/store/modules/news/dto/create-news.dto';
import { UpdateNewsDto } from 'src/modules/store/modules/news/dto/update-news.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { NewsPost } from 'src/entities/news-post.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';
import { NewsPostDto } from 'src/modules/store/modules/news/dto/news.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/auth/modules/policy/policy.types';
import { Request } from 'express';

/**
 * NewsController
 *
 * Routes:
 *  - GET    /stores/:storeId/news                 -> list posts for store (optionally only published)
 *  - GET    /stores/:storeId/news/:id             -> get single post
 *  - POST   /stores/:storeId/news                 -> create post (author from req.user)
 *  - PUT    /stores/:storeId/news/:id             -> update post
 *  - DELETE /stores/:storeId/news/:id             -> delete post
 *  - POST   /stores/:storeId/news/:id/publish     -> publish post (store-admin)
 *  - POST   /stores/:storeId/news/:id/unpublish   -> unpublish post (store-admin)
 *
 * Authorization:
 *  - read: authenticated users
 *  - write/publish/unpublish/remove: store admins and moderators
 */
@Controller('stores/:storeId/news')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class NewsController extends BaseController<
  NewsPost,
  CreateNewsDto,
  UpdateNewsDto,
  NewsPostDto
> {
  static accessPolicies: AccessPolicies = {
    findAllByStore: { requireAuthenticated: true },
    findOne: { requireAuthenticated: true },
    createWithRelations: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    update: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    remove: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },

    publish: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    unpublish: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
  };

  constructor(private readonly newsService: NewsService) {
    super(newsService);
  }

  /**
   * List posts for a store. Query param filtering (onlyPublished) can be implemented
   * at controller level if desired (not included here to keep API minimal).
   *
   * @param storeId - store id (UUID)
   */
  @Get()
  async findAllByStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string
  ): Promise<NewsPost[]> {
    // default: return all posts (including unpublished). If you want only published,
    // add a query param and pass `onlyPublished` to service.
    return this.newsService.findAllByStore(storeId, false);
  }

  /**
   * Create a news post.
   * Author is taken from the authenticated request (req.user.id) when available.
   */
  @Post()
  async createWithRelations(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: CreateNewsDto,
    @Req() req: Request
  ): Promise<NewsPost | NewsPostDto> {
    const authorId = (req as any).user?.id;
    const enriched = { ...dto, storeId };
    return this.newsService.createWithRelations(enriched, authorId);
  }

  /**
   * Publish a post (set isPublished = true and set publishedAt if missing).
   */
  @Post(':id/publish')
  async publish(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<NewsPost | NewsPostDto> {
    return this.newsService.publish(id);
  }

  /**
   * Unpublish a post (set isPublished = false).
   */
  @Post(':id/unpublish')
  async unpublish(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<NewsPost | NewsPostDto> {
    return this.newsService.unpublish(id);
  }
}
