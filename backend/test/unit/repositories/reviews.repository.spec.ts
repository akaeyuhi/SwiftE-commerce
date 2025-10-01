import { Test } from '@nestjs/testing';
import { ReviewsRepository } from 'src/modules/products/reviews/reviews.repository';
import { Review } from 'src/entities/store/review.entity';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { createMock, MockedMethods } from '../utils/helpers';

describe('ReviewsRepository', () => {
  let repo: ReviewsRepository;
  let ds: Partial<MockedMethods<DataSource>>;
  let em: Partial<MockedMethods<EntityManager>>;

  beforeEach(async () => {
    em = createMock<EntityManager>([]);
    ds = createMock<DataSource>(['createEntityManager']);
    ds.createEntityManager!.mockReturnValue(em as unknown as EntityManager);

    const module = await Test.createTestingModule({
      providers: [ReviewsRepository, { provide: DataSource, useValue: ds }],
    }).compile();

    repo = module.get<ReviewsRepository>(ReviewsRepository);
    jest.spyOn(repo, 'createQueryBuilder').mockImplementation(jest.fn());
  });

  it('getRatingAggregate returns zeroes when none', async () => {
    const raw = { count: null, avg: null };
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(raw),
    } as any as SelectQueryBuilder<Review>;
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const res = await repo.getRatingAggregate('p1');
    expect(qb.select).toHaveBeenCalled();
    expect(qb.where).toHaveBeenCalledWith('r.product = :productId', {
      productId: 'p1',
    });
    expect(res).toEqual({ count: 0, avg: null });
  });

  it('getRatingAggregate parses raw values', async () => {
    const raw = { count: '10', avg: '4.5' };
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(raw),
    } as any;
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const res = await repo.getRatingAggregate('p1');
    expect(res).toEqual({ count: 10, avg: 4.5 });
  });
});
