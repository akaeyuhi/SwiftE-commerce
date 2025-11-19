import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { NewsService } from 'src/modules/store/news/news.service';
import { CreateNewsDto } from 'src/modules/store/news/dto/create-news.dto';
import { UpdateNewsDto } from 'src/modules/store/news/dto/update-news.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { NewsPostDto } from 'src/modules/store/news/dto/news.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AccessPolicies } from 'src/modules/authorization/policy/policy.types';
import {
  Pagination,
  PaginationParams,
} from 'src/common/decorators/pagination.decorator';
import { PaginatedResponse } from 'src/common/decorators/paginated-response.decorator';
import { Request } from 'express';
import { UploadNewsFiles } from 'src/common/decorators/upload-news-files.decorator';

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
    createWithRelations: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
    },
    update: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
      adminRole: undefined,
    },
    remove: {
      requireAuthenticated: true,
      storeRoles: [StoreRoles.ADMIN, StoreRoles.MODERATOR],
      adminRole: undefined,
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
   * @param pagination
   */
  @Get('store-all')
  @PaginatedResponse(NewsPost)
  async findAllByStore(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Pagination() pagination: PaginationParams
  ): Promise<[NewsPost[], number]> {
    // default: return all posts (including unpublished). If you want only published,
    // add a query param and pass `onlyPublished` to service.
    return this.newsService.findAllByStore(storeId, false, pagination);
  }

  /**
   * Create a news post.
   * Author is taken from the authenticated request (req.user.id) when available.
   */
  @Post('/create')
  @UploadNewsFiles()
  async createWithRelations(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() dto: CreateNewsDto,
    @Req() req: Request,
    @UploadedFiles()
    files: { mainPhoto?: Express.Multer.File[]; photos?: Express.Multer.File[] }
  ): Promise<NewsPost | NewsPostDto> {
    const authorId = (req as any).user?.id;
    const mainPhoto = files.mainPhoto?.[0] ?? files.photos?.[0];
    const photos = files.photos;
    photos?.shift();
    const enriched = { ...dto, storeId, mainPhoto, photos };
    return this.newsService.createWithRelations(enriched, authorId);
  }

  @Post(':id/upload-files')
  @UploadNewsFiles()
  async uploadFiles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles()
    files: { mainPhoto?: Express.Multer.File[]; photos?: Express.Multer.File[] }
  ): Promise<NewsPost> {
    const mainPhoto = files.mainPhoto?.[0] ?? files.photos?.[0];
    const photos = files.photos;
    photos?.shift();
    return this.newsService.uploadFiles(id, mainPhoto, photos);
  }

  /**
   * Publish a post (set isPublished = true and set publishedAt if missing).
   */
  @Post(':id/publish')
  async publish(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<NewsPost | NewsPostDto> {
    return this.newsService.publish(id, storeId);
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

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) newsId: string,
    @Body() dto: UpdateNewsDto
  ) {
    return this.newsService.update(newsId, dto);
  }
}
