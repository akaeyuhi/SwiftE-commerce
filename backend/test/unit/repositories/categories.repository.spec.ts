import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesRepository } from 'src/modules/store/categories/categories.repository';
import { Category } from 'src/entities/store/product/category.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from '../utils/helpers';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockCategory: Category = {
    id: 'c1',
    name: 'Cat',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
  const mockList: Category[] = [mockCategory];

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<CategoriesRepository>(CategoriesRepository);

    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'createQueryBuilder').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  describe('findWithChildren', () => {
    it('delegates to findOne with children relation', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockCategory);
      const res = await repository.findWithChildren('c1');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'c1' },
        relations: ['children'],
      });
      expect(res).toEqual(mockCategory);
    });
  });

  describe('findAllWithRelations', () => {
    it('delegates to find with parent/children and order', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockList);
      const res = await repository.findAllWithRelations();
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['parent', 'children'],
        order: { name: 'ASC' },
      });
      expect(res).toEqual(mockList);
    });
  });

  describe('findCategoriesByStore', () => {
    it('builds query and returns categories', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockList),
      } as any;
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await repository.findCategoriesByStore('s1');
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(qb.leftJoin).toHaveBeenCalledWith('c.products', 'p');
      expect(qb.leftJoin).toHaveBeenCalledWith('p.store', 's');
      expect(qb.where).toHaveBeenCalledWith('s.id = :storeId', {
        storeId: 's1',
      });
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(qb.orderBy).toHaveBeenCalledWith('c.name', 'ASC');
      expect(res).toEqual(mockList);
    });
  });
});
