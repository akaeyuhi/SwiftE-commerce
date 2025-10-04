import { Test } from '@nestjs/testing';
import { ProductRepository } from 'src/modules/products/products.repository';
import { Product } from 'src/entities/store/product/product.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let ds: Partial<MockedMethods<DataSource>>;
  let em: Partial<MockedMethods<EntityManager>>;

  const mock: Product = {
    id: 'p1',
    name: 'N',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    em = createMock<EntityManager>([]);
    ds = createMock<DataSource>(['createEntityManager']);
    ds.createEntityManager!.mockReturnValue(em as unknown as EntityManager);

    const mod = await Test.createTestingModule({
      providers: [ProductRepository, { provide: DataSource, useValue: ds }],
    }).compile();

    repo = mod.get<ProductRepository>(ProductRepository);
    jest.spyOn(repo, 'createQueryBuilder').mockImplementation(jest.fn());
  });

  it('findAllByStore builds correct query', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mock]),
    } as any;
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    const res = await repo.findAllByStore('s1');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('p.store', 's');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('p.photos', 'photos');
    expect(qb.where).toHaveBeenCalledWith('s.id = :storeId', { storeId: 's1' });
    expect(res).toEqual([mock]);
  });

  it('findWithRelations builds correct query', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mock),
    } as any;
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    const res = await repo.findWithRelations('p1');
    ['photos', 'variants', 'categories', 'reviews'].forEach((rel) => {
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(`p.${rel}`, rel);
    });
    expect(qb.where).toHaveBeenCalledWith('p.id = :id', { id: 'p1' });
    expect(res).toEqual(mock);
  });

  it('findProductsByCategory without stores filters', async () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mock]),
    } as any;
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    const res = await repo.findProductsByCategory('c1');
    expect(qb.leftJoin).toHaveBeenCalledWith('p.categories', 'c');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('p.store', 's');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('p.photos', 'photos');
    expect(qb.where).toHaveBeenCalledWith('c.id = :categoryId', {
      categoryId: 'c1',
    });
    expect(res).toEqual([mock]);
  });

  it('findProductsByCategory with stores filter', async () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mock]),
    } as any;
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    const res = await repo.findProductsByCategory('c1', 's1');
    expect(qb.andWhere).toHaveBeenCalledWith('s.id = :storeId', {
      storeId: 's1',
    });
    expect(res).toEqual([mock]);
  });
});
