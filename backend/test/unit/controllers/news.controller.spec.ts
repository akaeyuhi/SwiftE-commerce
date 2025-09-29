import { Test, TestingModule } from '@nestjs/testing';
import { NewsController } from 'src/modules/store/news/news.controller';
import { NewsService } from 'src/modules/store/news/news.service';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  createServiceMock,
  createPolicyMock,
  createGuardMock,
  MockedMethods,
} from '../utils/helpers';
import { NewsPost } from 'src/entities/store/news-post.entity';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';

describe('NewsController', () => {
  let controller: NewsController;
  let service: Partial<MockedMethods<NewsService>>;
  let policyMock: ReturnType<typeof createPolicyMock>;
  let guardMock: ReturnType<typeof createGuardMock>;

  const mock: NewsPost = {
    id: 'p1',
    title: 'T',
    content: 'C',
    store: { id: 's1' } as Store,
    author: { id: 'u1' } as User,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NewsPost;

  beforeEach(async () => {
    service = createServiceMock<NewsService>([
      'findAllByStore',
      'findOne',
      'createWithRelations',
      'publish',
      'unpublish',
    ]);
    policyMock = createPolicyMock();
    guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [
        { provide: NewsService, useValue: service },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get<NewsController>(NewsController);
    jest.clearAllMocks();
  });

  describe('findAllByStore', () => {
    it('delegates findAllByStore', async () => {
      service.findAllByStore!.mockResolvedValue([mock]);
      const res = await controller.findAllByStore('s1');
      expect(service.findAllByStore).toHaveBeenCalledWith('s1', false);
      expect(res).toEqual([mock]);
    });
  });

  describe('createWithRelations', () => {
    it('delegates createWithRelations with req.user', async () => {
      const dto = { title: 'T', content: 'C' };
      service.createWithRelations!.mockResolvedValue(mock);
      const fakeReq: any = { user: { id: 'u1' } };
      const res = await controller.createWithRelations(
        's1',
        dto as any,
        fakeReq
      );
      expect(service.createWithRelations).toHaveBeenCalledWith(
        { ...dto, storeId: 's1' },
        'u1'
      );
      expect(res).toEqual(mock);
    });
  });

  describe('publish/unpublish', () => {
    it('delegates publish', async () => {
      service.publish!.mockResolvedValue(mock);
      const res = await controller.publish('s1', 'p1');
      expect(service.publish).toHaveBeenCalledWith('p1');
      expect(res).toEqual(mock);
    });
    it('delegates unpublish', async () => {
      service.unpublish!.mockResolvedValue(mock);
      const res = await controller.unpublish('s1', 'p1');
      expect(service.unpublish).toHaveBeenCalledWith('p1');
      expect(res).toEqual(mock);
    });
  });
});
