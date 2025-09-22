import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/common/abstracts/base.service';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { CreateNewsDto } from 'src/modules/store/modules/news/dto/create-news.dto';
import { UpdateNewsDto } from 'src/modules/store/modules/news/dto/update-news.dto';
import { NewsRepository } from 'src/modules/store/modules/news/news.repository';
import { NewsPostDto } from 'src/modules/store/modules/news/dto/news.dto';

/**
 * NewsService
 *
 * Small service extending BaseService. Adds helpers for listing posts by store
 * and publishing/unpublishing posts.
 */
@Injectable()
export class NewsService extends BaseService<
  NewsPost,
  CreateNewsDto,
  UpdateNewsDto,
  NewsPostDto
> {
  constructor(private readonly newsRepo: NewsRepository) {
    super(newsRepo);
  }

  /**
   * List posts for a store. Optionally restrict to published posts only.
   *
   * @param storeId - store id
   * @param onlyPublished - if true return only published posts
   * @returns array of NewsPost
   */
  async findAllByStore(
    storeId: string,
    onlyPublished = false
  ): Promise<NewsPost[]> {
    const where = { store: { id: storeId }, isPublished: onlyPublished };
    return this.repository.find({
      where,
      relations: ['author'],
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Create a post wiring relations (store & author) and handling publishedAt.
   *
   * Uses repository.createEntity which persists the row and returns the saved entity.
   *
   * @param dto - CreateNewsPostDto
   * @param authorId - optional author id (useful when deriving from req.user)
   * @returns created NewsPost or mapped DTO if a mapper is provided
   */
  async createWithRelations(
    dto: CreateNewsDto,
    authorId?: string
  ): Promise<NewsPost | NewsPostDto> {
    const partial = {
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

    const created = await this.repository.createEntity(partial);
    return (this as any).mapper?.toDto(created) ?? created;
  }

  /**
   * Publish a post (set isPublished = true and set publishedAt if empty).
   *
   * @param postId - id of the post to publish
   * @returns updated NewsPost (freshly loaded)
   * @throws NotFoundException when post missing
   */
  async publish(postId: string): Promise<NewsPost | NewsPostDto> {
    const post = await this.repository.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    post.isPublished = true;
    if (!post.publishedAt) post.publishedAt = new Date();

    await this.repository.save(post);
    const after = await this.repository.findById(postId);
    return (this as any).mapper?.toDto(after as any) ?? (after as any);
  }

  /**
   * Unpublish a post (set isPublished = false). Does not clear publishedAt.
   *
   * @param postId - id of post
   * @returns updated NewsPost
   */
  async unpublish(postId: string): Promise<NewsPost | NewsPostDto> {
    const post = await this.repository.findById(postId);
    if (!post) throw new NotFoundException('Post not found');
    post.isPublished = false;
    await this.repository.save(post);
    const after = await this.repository.findById(postId);
    return (this as any).mapper?.toDto(after as any) ?? (after as any);
  }
}
