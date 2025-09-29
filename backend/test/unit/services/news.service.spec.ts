import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from 'src/modules/store/news/news.service';
import { NewsRepository } from 'src/modules/store/news/news.repository';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { CreateNewsDto } from 'src/modules/store/news/dto/create-news.dto';
import { createRepositoryMock, MockedMethods } from '../utils/helpers';
import { NotFoundException } from '@nestjs/common';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';

describe('NewsService', () => {
  let service: NewsService;
  let repo: Partial<MockedMethods<NewsRepository>>;

  const mockPost: NewsPost = {
    id: 'p1',
    title: 'Title',
    content: 'Content',
    store: { id: 's1' } as Store,
    author: { id: 'u1' } as User,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NewsPost;

  beforeEach(async () => {
    repo = createRepositoryMock<NewsRepository>([
      'find',
      'createEntity',
      'findById',
      'save',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsService, { provide: NewsRepository, useValue: repo }],
    }).compile();

    service = module.get<NewsService>(NewsService);
    jest.clearAllMocks();
  });

  describe('findAllByStore', () => {
    it('returns posts with relations', async () => {
      repo.find!.mockResolvedValue([mockPost]);
      const res = await service.findAllByStore('s1', true);
      expect(repo.find).toHaveBeenCalledWith({
        where: { store: { id: 's1' }, isPublished: true },
        relations: ['author'],
        order: { publishedAt: 'DESC', createdAt: 'DESC' },
      });
      expect(res).toEqual([mockPost]);
    });
  });

  describe('createWithRelations', () => {
    it('creates post wiring relations', async () => {
      const dto: CreateNewsDto = {
        storeId: 's1',
        title: 'T',
        content: 'C',
        isPublished: true,
      };
      const created = { ...mockPost, ...dto } as NewsPost;
      repo.createEntity!.mockResolvedValue(created);

      const res = await service.createWithRelations(dto, 'u1');
      expect(repo.createEntity).toHaveBeenCalledWith({
        store: { id: 's1' },
        author: { id: 'u1' },
        title: 'T',
        content: 'C',
        isPublished: true,
        publishedAt: undefined,
      });
      expect(res).toEqual(created);
    });
  });

  describe('publish', () => {
    it('throws when missing', async () => {
      repo.findById!.mockResolvedValue(null);
      await expect(service.publish('p1')).rejects.toThrow(NotFoundException);
    });

    it('publishes and sets publishedAt', async () => {
      const post = { ...mockPost };
      repo.findById!.mockResolvedValueOnce(post).mockResolvedValueOnce({
        ...post,
        isPublished: true,
        publishedAt: new Date(),
      } as NewsPost);
      repo.save!.mockResolvedValue(undefined as any);

      const res = await service.publish('p1');
      expect(post.isPublished).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(post);
      expect(repo.findById).toHaveBeenCalledTimes(2);
      expect(res.isPublished).toBe(true);
    });
  });

  describe('unpublish', () => {
    it('throws when missing', async () => {
      repo.findById!.mockResolvedValue(null);
      await expect(service.unpublish('p1')).rejects.toThrow(NotFoundException);
    });

    it('unpublishes post', async () => {
      const post = {
        ...mockPost,
        isPublished: true,
        publishedAt: new Date(),
      } as NewsPost;
      repo.findById!.mockResolvedValueOnce(post).mockResolvedValueOnce(post);
      repo.save!.mockResolvedValue(undefined as any);

      const res = await service.unpublish('p1');
      expect(post.isPublished).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(post);
      expect(res.isPublished).toBe(false);
    });
  });
});
