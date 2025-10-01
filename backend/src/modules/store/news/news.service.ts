import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from 'src/common/abstracts/base.service';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsRepository } from './news.repository';
import { NewsPostDto } from './dto/news.dto';
import { NewsPublishedEvent } from 'src/common/events/news/news-published.event';

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
    private readonly eventEmitter: EventEmitter2
  ) {
    super(newsRepo);
  }

  /**
   * List posts for a store. Optionally restrict to published posts only.
   */
  async findAllByStore(
    storeId: string,
    onlyPublished = false
  ): Promise<NewsPost[]> {
    const where: any = { store: { id: storeId } };
    if (onlyPublished) {
      where.isPublished = true;
    }

    return this.newsRepo.find({
      where,
      relations: ['author', 'store'],
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
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
      store: dto.storeId ? { id: dto.storeId } : undefined,
      author: dto.authorId ? { id: dto.authorId } : undefined,
      title: dto.title,
      content: dto.content,
      isPublished: dto.isPublished ?? false,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
    };

    if (authorId) {
      partial.author = { id: authorId };
    }

    const created = await this.newsRepo.createEntity(partial);

    // If published immediately, emit event
    if (created.isPublished && created.publishedAt) {
      await this.emitNewsPublishedEvent(created);
    }

    return (this as any).mapper?.toDto(created) ?? created;
  }

  /**
   * Publish a post (set isPublished = true and set publishedAt if empty).
   *
   * ⚡ Emits event to trigger notifications to all followers.
   */
  async publish(postId: string): Promise<NewsPost | NewsPostDto> {
    const post = await this.newsRepo.findOne({
      where: { id: postId },
      relations: ['author', 'store'],
    });

    if (!post) throw new NotFoundException('Post not found');

    const wasPublished = post.isPublished;

    post.isPublished = true;
    if (!post.publishedAt) post.publishedAt = new Date();

    await this.newsRepo.save(post);

    // Emit event only if newly published (not re-publishing)
    if (!wasPublished) {
      await this.emitNewsPublishedEvent(post);
    }

    const after = await this.newsRepo.findById(postId);
    return (this as any).mapper?.toDto(after as any) ?? (after as any);
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
    return (this as any).mapper?.toDto(after as any) ?? (after as any);
  }

  /**
   * Emit news published event.
   */
  private async emitNewsPublishedEvent(post: NewsPost): Promise<void> {
    try {
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

      this.eventEmitter.emit('news.published', event);

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
