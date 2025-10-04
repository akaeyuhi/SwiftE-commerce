import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from 'src/modules/store/news/news.service';
import { NewsRepository } from 'src/modules/store/news/news.repository';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { CreateNewsDto } from 'src/modules/store/news/dto/create-news.dto';
import {
  createRepositoryMock,
  MockedMethods,
  createMock,
} from '../../../utils/helpers';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { NewsPublishedEvent } from 'src/common/events/news/news-published.event';

describe('NewsService', () => {
  let service: NewsService;
  let repo: Partial<MockedMethods<NewsRepository>>;
  let eventEmitter: Partial<MockedMethods<EventEmitter2>>;

  const mockUser: User = {
    id: 'u1',
    email: 'author@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Store;

  const mockPost: NewsPost = {
    id: 'p1',
    title: 'Test News Title',
    content: 'This is test content for the news post.',
    store: mockStore,
    author: mockUser,
    isPublished: false,
    publishedAt: undefined,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as NewsPost;

  const mockPublishedPost: NewsPost = {
    ...mockPost,
    id: 'p2',
    isPublished: true,
    publishedAt: new Date('2024-01-01'),
  } as NewsPost;

  beforeEach(async () => {
    repo = createRepositoryMock<NewsRepository>([
      'find',
      'findOne',
      'findById',
      'createEntity',
      'save',
      'update',
      'delete',
    ]);

    eventEmitter = createMock<EventEmitter2>(['emit']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: NewsRepository, useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(NewsService);
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.create).toBe('function');
      expect(typeof service.update).toBe('function');
    });
  });

  describe('findAllByStore', () => {
    it('should return all posts for store when onlyPublished is false', async () => {
      repo.find!.mockResolvedValue([mockPost, mockPublishedPost]);

      const result = await service.findAllByStore('s1', false);

      expect(repo.find).toHaveBeenCalledWith({
        where: { store: { id: 's1' } },
        relations: ['author', 'store'],
        order: { publishedAt: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toEqual([mockPost, mockPublishedPost]);
      expect(result).toHaveLength(2);
    });

    it('should return only published posts when onlyPublished is true', async () => {
      repo.find!.mockResolvedValue([mockPublishedPost]);

      const result = await service.findAllByStore('s1', true);

      expect(repo.find).toHaveBeenCalledWith({
        where: { store: { id: 's1' }, isPublished: true },
        relations: ['author', 'store'],
        order: { publishedAt: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toEqual([mockPublishedPost]);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no posts found', async () => {
      repo.find!.mockResolvedValue([]);

      const result = await service.findAllByStore('s1', true);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should include author and store relations', async () => {
      repo.find!.mockResolvedValue([mockPost]);

      await service.findAllByStore('s1');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['author', 'store'],
        })
      );
    });

    it('should order by publishedAt DESC, then createdAt DESC', async () => {
      repo.find!.mockResolvedValue([]);

      await service.findAllByStore('s1');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { publishedAt: 'DESC', createdAt: 'DESC' },
        })
      );
    });
  });

  describe('createWithRelations', () => {
    it('should create post with store and author relations', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        title: 'New Post',
        content: 'Post content',
        isPublished: false,
      };

      repo.createEntity!.mockResolvedValue(mockPost);

      const result = await service.createWithRelations(dto, 'u1');

      expect(repo.createEntity).toHaveBeenCalledWith({
        store: { id: 's1' },
        author: { id: 'u1' },
        title: 'New Post',
        content: 'Post content',
        isPublished: false,
        publishedAt: undefined,
      });
      expect(result).toEqual(mockPost);
    });

    it('should use authorId from dto if provided', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        authorId: 'u2',
        title: 'Post',
        content: 'Content',
        isPublished: false,
      };

      repo.createEntity!.mockResolvedValue(mockPost);

      await service.createWithRelations(dto);

      expect(repo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          author: { id: 'u2' },
        })
      );
    });

    it('should override dto authorId with parameter authorId', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        authorId: 'u2',
        title: 'Post',
        content: 'Content',
        isPublished: false,
      };

      repo.createEntity!.mockResolvedValue(mockPost);

      await service.createWithRelations(dto, 'u1');

      expect(repo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          author: { id: 'u1' }, // Should use parameter, not dto
        })
      );
    });

    it('should set publishedAt from dto if provided', async () => {
      const publishedAt = new Date('2024-01-15');
      const dto: CreateNewsDto = {
        storeId: 's1',
        title: 'Post',
        content: 'Content',
        isPublished: true,
        publishedAt: publishedAt.toString(),
      };

      repo.createEntity!.mockResolvedValue({
        ...mockPublishedPost,
        publishedAt,
      });

      await service.createWithRelations(dto, 'u1');

      expect(repo.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt,
        })
      );
    });

    it('should emit event when creating published post', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        title: 'Published Post',
        content: 'Content for published post',
        isPublished: true,
      };

      const createdPost = {
        ...mockPublishedPost,
        title: dto.title,
        content: dto.content,
      };

      repo.createEntity!.mockResolvedValue(createdPost);
      eventEmitter.emit!.mockReturnValue(true);

      await service.createWithRelations(dto, 'u1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'news.published',
        expect.any(NewsPublishedEvent)
      );
    });

    it('should not emit event when creating unpublished post', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        title: 'Draft Post',
        content: 'Draft content',
        isPublished: false,
      };

      repo.createEntity!.mockResolvedValue(mockPost);

      await service.createWithRelations(dto, 'u1');

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should handle post without publishedAt even if isPublished is true', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        title: 'Post',
        content: 'Content',
        isPublished: true,
      };

      const postWithoutPublishedAt = { ...mockPost, isPublished: true };
      repo.createEntity!.mockResolvedValue(postWithoutPublishedAt);

      await service.createWithRelations(dto, 'u1');

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should throw NotFoundException when post not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.publish('nonexistent')).rejects.toThrow(
        NotFoundException
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        relations: ['author', 'store'],
      });
    });

    it('should publish unpublished post and set publishedAt', async () => {
      const unpublishedPost = { ...mockPost };
      repo.findOne!.mockResolvedValue(unpublishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...unpublishedPost,
        isPublished: true,
        publishedAt: expect.any(Date),
      });

      const result = await service.publish('p1');

      expect(unpublishedPost.isPublished).toBe(true);
      expect(unpublishedPost.publishedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(unpublishedPost);
      expect(result.isPublished).toBe(true);
    });

    it('should emit event when publishing for the first time', async () => {
      const unpublishedPost = { ...mockPost };
      repo.findOne!.mockResolvedValue(unpublishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...unpublishedPost,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish('p1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'news.published',
        expect.any(NewsPublishedEvent)
      );
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should not emit event when re-publishing already published post', async () => {
      const alreadyPublished = { ...mockPublishedPost };
      repo.findOne!.mockResolvedValue(alreadyPublished);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue(alreadyPublished);

      await service.publish('p2');

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should preserve existing publishedAt when re-publishing', async () => {
      const originalPublishedAt = new Date('2024-01-01');
      const publishedPost = {
        ...mockPublishedPost,
        publishedAt: originalPublishedAt,
      };
      repo.findOne!.mockResolvedValue(publishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue(publishedPost);

      await service.publish('p2');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: originalPublishedAt,
        })
      );
    });

    it('should include event with correct data', async () => {
      const unpublishedPost = { ...mockPost };
      repo.findOne!.mockResolvedValue(unpublishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...unpublishedPost,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish('p1');

      expect(eventEmitter.emit).toHaveBeenCalledWith('news.published', {
        newsId: mockPost.id,
        storeId: mockStore.id,
        storeName: mockStore.name,
        title: mockPost.title,
        content: mockPost.content,
        excerpt: expect.stringContaining('This is test content'),
        authorName: 'John Doe',
        publishedAt: expect.any(Date),
        newsUrl: expect.stringContaining(
          `/stores/${mockStore.id}/news/${mockPost.id}`
        ),
        coverImageUrl: undefined,
        category: undefined,
      });
    });

    it('should handle event emission errors gracefully', async () => {
      const unpublishedPost = { ...mockPost };
      repo.findOne!.mockResolvedValue(unpublishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...unpublishedPost,
        isPublished: true,
        publishedAt: new Date(),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      eventEmitter.emit!.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Should not throw despite event error
      const result = await service.publish('p1');

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('unpublish', () => {
    it('should throw NotFoundException when post not found', async () => {
      repo.findById!.mockResolvedValue(null);

      await expect(service.unpublish('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should unpublish published post', async () => {
      const publishedPost = { ...mockPublishedPost };
      repo.findById!.mockResolvedValueOnce(publishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValueOnce({
        ...publishedPost,
        isPublished: false,
      });

      const result = await service.unpublish('p2');

      expect(publishedPost.isPublished).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(publishedPost);
      expect(result.isPublished).toBe(false);
    });

    it('should preserve publishedAt when unpublishing', async () => {
      const publishedAt = new Date('2024-01-01');
      const publishedPost = {
        ...mockPublishedPost,
        publishedAt,
      };
      repo.findById!.mockResolvedValueOnce(publishedPost);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValueOnce({
        ...publishedPost,
        isPublished: false,
      });

      await service.unpublish('p2');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt, // Should still be there
        })
      );
    });

    it('should not emit event when unpublishing', async () => {
      repo.findById!.mockResolvedValue(mockPublishedPost);
      repo.save!.mockResolvedValue(undefined as any);

      await service.unpublish('p2');

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('excerpt generation', () => {
    it('should generate excerpt from short content', async () => {
      const shortContent = 'Short content.';
      const post = {
        ...mockPost,
        content: shortContent,
        isPublished: false,
      };

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.excerpt).toBe(shortContent);
    });

    it('should truncate long content with ellipsis', async () => {
      const longContent = 'A'.repeat(250);
      const post = {
        ...mockPost,
        content: longContent,
        isPublished: false,
      };

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.excerpt.length).toBe(203); // 200 + '...'
      expect(event.excerpt).toContain('...');
    });

    it('should strip HTML tags from content', async () => {
      const htmlContent = '<p>Test <strong>content</strong> with HTML</p>';
      const post = {
        ...mockPost,
        content: htmlContent,
        isPublished: false,
      };

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.excerpt).toBe('Test content with HTML');
      expect(event.excerpt).not.toContain('<');
      expect(event.excerpt).not.toContain('>');
    });
  });

  describe('author name extraction', () => {
    it('should use full name when available', async () => {
      const post = { ...mockPost, isPublished: false };

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.authorName).toBe('John Doe');
    });

    it('should use firstName only when lastName missing', async () => {
      const post = {
        ...mockPost,
        author: { ...mockUser, lastName: undefined },
        isPublished: false,
      } as unknown as NewsPost;

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.authorName).toBe('John');
    });

    it('should use email username when no name available', async () => {
      const post = {
        ...mockPost,
        author: {
          ...mockUser,
          firstName: undefined,
          lastName: undefined,
        },
        isPublished: false,
      } as unknown as NewsPost;

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.authorName).toBe('author');
    });

    it('should use default when no author info available', async () => {
      const post = {
        ...mockPost,
        author: null,
        isPublished: false,
      } as unknown as NewsPost;

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.authorName).toBe('Store Team');
    });
  });

  describe('URL generation', () => {
    it('should generate correct news URL', async () => {
      const post = { ...mockPost, isPublished: false };

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.newsUrl).toContain('/stores/s1/news/p1');
    });

    it('should use FRONTEND_URL environment variable', async () => {
      process.env.FRONTEND_URL = 'https://custom-domain.com';

      const post = { ...mockPost, isPublished: false };

      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      await service.publish(post.id);

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = emitCall[1] as NewsPublishedEvent;

      expect(event.newsUrl).toContain('https://custom-domain.com');

      delete process.env.FRONTEND_URL;
    });
  });

  describe('edge cases', () => {
    it('should handle posts with missing store gracefully', async () => {
      const postWithoutStore = {
        ...mockPost,
        store: null,
        isPublished: false,
      } as unknown as NewsPost;

      repo.findOne!.mockResolvedValue(postWithoutStore);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...postWithoutStore,
        isPublished: true,
        publishedAt: new Date(),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.publish('p1');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle concurrent publish calls', async () => {
      const post = { ...mockPost, isPublished: false };
      repo.findOne!.mockResolvedValue(post);
      repo.save!.mockResolvedValue(undefined as any);
      repo.findById!.mockResolvedValue({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      });
      eventEmitter.emit!.mockReturnValue(true);

      const promises = [
        service.publish('p1'),
        service.publish('p1'),
        service.publish('p1'),
      ];

      await Promise.all(promises);

      expect(repo.save).toHaveBeenCalledTimes(3);
    });
  });
});
