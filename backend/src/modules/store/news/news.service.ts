import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from 'src/common/abstracts/base.service';
import { PaginationParams } from 'src/common/decorators/pagination.decorator';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsRepository } from './news.repository';
import { NewsPostDto } from './dto/news.dto';
import { NewsPublishedEvent } from 'src/common/events/news/news-published.event';
import { domainEventFactory } from 'src/common/events/helper';

import { NewsFileService } from 'src/modules/store/news/news-file.service';

/**
 * NewsService
 *
 * Manages news posts with automatic notification system.
 * Emits events when posts are published to trigger follower notifications.
 */
@Injectable()
export class NewsService extends BaseService<
  NewsPost,
  CreateNewsDto,
  UpdateNewsDto,
  NewsPostDto
> {
  constructor(
    private readonly newsRepo: NewsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly newsFileService: NewsFileService
  ) {
    super(newsRepo);
  }

  async uploadFiles(
    newsId: string,
    mainPhoto?: Express.Multer.File,
    photos?: Express.Multer.File[]
  ): Promise<NewsPost> {
    const news = await this.newsRepo.findById(newsId);
    if (!news) {
      throw new NotFoundException('News not found');
    }

    if (mainPhoto) {
      news.mainPhotoUrl = await this.newsFileService.saveFile(
        mainPhoto,
        newsId,
        'mainPhoto'
      );
    }

    if (photos) {
      for (const photo of photos) {
        const url = await this.newsFileService.saveFile(photo, newsId, 'photo');
        news.photoUrls.push(url);
      }
    }

    return this.newsRepo.save(news);
  }

  /**
   * List posts for a store. Optionally restrict to published posts only.
   */
  async findAllByStore(
    storeId: string,
    onlyPublished = false,
    pagination?: PaginationParams
  ): Promise<[NewsPost[], number]> {
    const { limit = 10, offset = 0 } = pagination || {};
    const where: any = { storeId };
    if (onlyPublished) {
      where.isPublished = true;
    }

    return this.newsRepo.findAndCount({
      where,
      relations: ['author', 'store'],
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Create a post wiring relations (store & author) and handling publishedAt.
   */
  async createWithRelations(
    dto: CreateNewsDto,
    authorId?: string
  ): Promise<NewsPost | NewsPostDto> {
    const partial: any = {
      storeId: dto.storeId,
      authorId: authorId ? authorId : dto.authorId,
      title: dto.title ?? '',
      content: dto.content ?? '',
      tags: dto.tags ?? [],
      isPublished: dto.isPublished ?? false,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
    };

    const created = await this.newsRepo.createEntity(partial);

    if (dto.mainPhoto || dto.photos) {
      await this.uploadFiles(created.id, dto.mainPhoto, dto.photos);
    }

    const reloaded = await this.newsRepo.findOne({
      where: { id: created.id },
      relations: ['author', 'store'],
    });

    if (!reloaded) {
      throw new NotFoundException('Created post not found');
    }

    if (reloaded.isPublished && reloaded.publishedAt) {
      await this.emitNewsPublishedEvent(reloaded);
    }

    return reloaded;
  }

  /**
   * Publish a post (set isPublished = true and set publishedAt if empty).
   *
   * ⚡ Emits event to trigger notifications to all followers.
   */
  async publish(
    postId: string,
    storeId: string
  ): Promise<NewsPost | NewsPostDto> {
    const post = await this.newsRepo.findOne({
      where: { id: postId, storeId },
      relations: ['author', 'store'],
    });

    if (!post) throw new NotFoundException('Post not found');

    const wasPublished = post.isPublished;

    post.isPublished = true;
    if (!post.publishedAt) post.publishedAt = new Date();

    await this.newsRepo.save(post);

    if (!wasPublished && post.store && post.author) {
      await this.emitNewsPublishedEvent(post);
    }

    return (await this.newsRepo.findById(postId))!;
  }

  /**
   * Unpublish a post (set isPublished = false). Does not clear publishedAt.
   */
  async unpublish(postId: string): Promise<NewsPost | NewsPostDto> {
    const post = await this.newsRepo.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    post.isPublished = false;
    await this.newsRepo.save(post);

    const after = await this.newsRepo.findById(postId);
    return after!;
  }

  /**
   * Emit news published event.
   */
  private async emitNewsPublishedEvent(post: NewsPost): Promise<void> {
    try {
      if (!post.store) {
        console.warn(
          `Cannot emit event: post ${post.id} has no store relation`
        );
        return;
      }
      const event = new NewsPublishedEvent(
        post.id,
        post.store.id,
        post.store.name,
        post.title,
        post.content,
        this.generateExcerpt(post.content),
        this.getAuthorName(post.author),
        post.publishedAt || new Date(),
        this.generateNewsUrl(post.store.id, post.id),
        undefined, // coverImageUrl - add if you have this field
        undefined // category - add if you have this field
      );

      const domainEvent = domainEventFactory<NewsPublishedEvent>(
        'news.published',
        post.id,
        event
      );

      this.eventEmitter.emit('news.published', domainEvent);

      console.log(`Emitted news.published event for post ${post.id}`);
    } catch (error) {
      console.error(
        `Failed to emit news.published event for post ${post.id}`,
        error
      );
    }
  }

  /**
   * Generate excerpt from content (first 200 characters).
   */
  private generateExcerpt(content: string, maxLength: number = 200): string {
    // Strip HTML tags if content contains HTML
    const plainText = content.replace(/<[^>]*>/g, '');

    if (plainText.length <= maxLength) {
      return plainText;
    }

    return plainText.substring(0, maxLength).trim() + '...';
  }

  /**
   * Get author display name.
   */
  private getAuthorName(author: any): string {
    if (!author) return 'Store Team';

    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    if (author.firstName) {
      return author.firstName;
    }
    if (author.email) {
      return author.email.split('@')[0];
    }

    return 'Store Team';
  }

  /**
   * Generate news URL for frontend.
   */
  private generateNewsUrl(storeId: string, newsId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://your-store.com';
    return `${baseUrl}/stores/${storeId}/news/${newsId}`;
  }
}
