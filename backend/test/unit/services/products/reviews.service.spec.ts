import { Test } from '@nestjs/testing';
import { ReviewsService } from 'src/modules/products/reviews/reviews.service';
import { ReviewsRepository } from 'src/modules/products/reviews/reviews.repository';
import { Review } from 'src/entities/store/review.entity';
import { CreateReviewDto } from 'src/modules/products/reviews/dto/create-review.dto';
import { createRepositoryMock, MockedMethods } from 'test/unit/utils/helpers';
import { User } from 'src/entities/user/user.entity';
import { Product } from 'src/entities/store/product/product.entity';

describe('ReviewsService', () => {
  let svc: ReviewsService;
  let repo: Partial<MockedMethods<ReviewsRepository>>;

  const dto: CreateReviewDto = { productId: 'p1', rating: 4, comment: 'Nice' };
  const mock = {
    id: 'r1',
    ...dto,
    user: { id: 'u1' } as User,
    rating: 5,
    comment: 'Nice',
    product: { id: 'p1' } as Product,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Review;

  beforeEach(async () => {
    repo = createRepositoryMock<ReviewsRepository>(['find', 'createEntity']);
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: repo },
      ],
    }).compile();
    svc = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('findAllByProduct delegates with correct args', async () => {
    repo.find!.mockResolvedValue([mock]);
    const res = await svc.findAllByProduct('p1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { product: { id: 'p1' } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    expect(res).toEqual([mock]);
  });

  it('findAllByUser delegates with correct args', async () => {
    repo.find!.mockResolvedValue([mock]);
    await svc.findAllByUser('u1');
    expect(repo.find).toHaveBeenCalledWith({
      where: { user: { id: 'u1' } },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  });

  it('createWithRelations uses authorId', async () => {
    repo.createEntity!.mockResolvedValue(mock);
    const res = await svc.createWithRelations(dto, 'u2');
    expect(repo.createEntity).toHaveBeenCalledWith({
      product: { id: 'p1' },
      user: { id: 'u2' },
      rating: 4,
      comment: 'Nice',
    });
    expect(res).toEqual(mock);
  });
});
