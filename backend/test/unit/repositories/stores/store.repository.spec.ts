// test/unit/store/store.repository.spec.ts
import { StoreRepository } from 'src/modules/store/store.repository';
import { Store } from 'src/entities/store/store.entity';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { Test, TestingModule } from '@nestjs/testing';

describe('StoreRepository', () => {
  let repository: StoreRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<Store>>>;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    description: 'A test store',
    productCount: 10,
    followerCount: 100,
    totalRevenue: 5000,
    orderCount: 50,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as Store;

  const mockStoreList: Store[] = [
    mockStore,
    {
      id: 's2',
      name: 'Another Store',
      description: 'Another test store',
      productCount: 20,
      followerCount: 200,
      totalRevenue: 10000,
      orderCount: 100,
      isActive: true,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as unknown as Store,
  ];

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
      getOne: jest.fn(),
    } as any;

    entityManager = createMock<EntityManager>(['query']);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<StoreRepository>(StoreRepository);

    // Mock inherited Repository methods
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOneBy').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'save').mockImplementation(jest.fn());
    jest.spyOn(repository, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repository, 'update').mockImplementation(jest.fn());
    jest
      .spyOn(repository, 'createQueryBuilder')
      .mockReturnValue(queryBuilder as any);

    jest.clearAllMocks();
  });

  describe('findStoreByName', () => {
    it('should find store by name', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockStore);

      const result = await repository.findStoreByName('Test Store');

      expect(result).toEqual(mockStore);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Store' },
      });
    });

    it('should return null when store not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findStoreByName('Nonexistent');

      expect(result).toBeNull();
    });

    it('should handle special characters in names', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockStore);

      await repository.findStoreByName(`Store's & Co.`);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: `Store's & Co.` },
      });
    });
  });

  describe('findTopByRevenue', () => {
    it('should return top stores by revenue', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockStoreList);

      const result = await repository.findTopByRevenue(10);

      expect(result).toEqual(mockStoreList);
      expect(repository.find).toHaveBeenCalledWith({
        select: [
          'id',
          'name',
          'productCount',
          'followerCount',
          'totalRevenue',
          'orderCount',
        ],
        order: { totalRevenue: 'DESC' },
        take: 10,
      });
    });

    it('should handle custom limits', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      await repository.findTopByRevenue(25);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 })
      );
    });

    it('should return empty array when no stores', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findTopByRevenue(10);

      expect(result).toEqual([]);
    });
  });

  describe('findTopByProductCount', () => {
    it('should return top stores by product count', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockStoreList);

      const result = await repository.findTopByProductCount(10);

      expect(result).toEqual(mockStoreList);
      expect(repository.find).toHaveBeenCalledWith({
        select: [
          'id',
          'name',
          'productCount',
          'followerCount',
          'totalRevenue',
          'orderCount',
        ],
        order: { productCount: 'DESC' },
        take: 10,
      });
    });

    it('should order by productCount descending', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      await repository.findTopByProductCount(5);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { productCount: 'DESC' } })
      );
    });
  });

  describe('recalculateStats', () => {
    it('should recalculate all stats for a store', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateStats('s1');

      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE stores s'),
        ['s1']
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('product_count'),
        ['s1']
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('follower_count'),
        ['s1']
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('order_count'),
        ['s1']
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('total_revenue'),
        ['s1']
      );
    });

    it('should use COALESCE for total_revenue', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateStats('s1');

      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE'),
        ['s1']
      );
    });

    it('should filter out deleted products', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateStats('s1');

      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        ['s1']
      );
    });

    it('should only count completed orders for revenue', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateStats('s1');

      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining(`status = 'completed'`),
        ['s1']
      );
    });

    it('should handle query errors', async () => {
      entityManager.query!.mockRejectedValue(new Error('Query failed'));

      await expect(repository.recalculateStats('s1')).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('recalculateAllStats', () => {
    it('should recalculate stats for all stores', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateAllStats();

      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE stores s')
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.not.stringContaining('WHERE s.id')
      );
    });

    it('should not use WHERE clause', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateAllStats();

      const call = entityManager.query!.mock.calls[0];
      expect(call[0]).not.toContain('WHERE s.id');
      expect(call[1]).toBeUndefined(); // No parameters
    });

    it('should update all stat columns', async () => {
      entityManager.query!.mockResolvedValue([]);

      await repository.recalculateAllStats();

      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('product_count')
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('follower_count')
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('order_count')
      );
      expect(entityManager.query).toHaveBeenCalledWith(
        expect.stringContaining('total_revenue')
      );
    });
  });

  describe('searchStoreByName', () => {
    it('should search stores with single term', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([mockStore]);

      const result = await repository.searchStoreByName('test', 20, ['test']);

      expect(result).toEqual([mockStore]);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(store.name) LIKE :query OR LOWER(store.description) LIKE :query)',
        { query: '%test%' }
      );
    });

    it('should search with multiple terms', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('gaming store', 20, [
        'gaming',
        'store',
      ]);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(store.name) LIKE :term0 OR LOWER(store.description) LIKE :term0)',
        { term0: '%gaming%' }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(store.name) LIKE :term1 OR LOWER(store.description) LIKE :term1)',
        { term1: '%store%' }
      );
    });

    it('should calculate relevance score', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test']);

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('CASE'),
        'relevanceScore'
      );
      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'exactQuery',
        'test'
      );
      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'startsWithQuery',
        'test%'
      );
    });

    it('should boost by follower and product count', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test']);

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('followerCount * 0.1'),
        'relevanceScore'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('productCount * 0.05'),
        'relevanceScore'
      );
    });

    it('should filter by minimum followers', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test'], {
        minFollowers: 100,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.followerCount >= :minFollowers',
        {
          minFollowers: 100,
        }
      );
    });

    it('should filter by minimum products', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test'], {
        minProducts: 10,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.productCount >= :minProducts',
        {
          minProducts: 10,
        }
      );
    });

    it('should sort by relevance by default', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test']);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'relevanceScore',
        'DESC'
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'store.followerCount',
        'DESC'
      );
    });

    it('should sort by followers when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test'], {
        sortBy: 'followers',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'store.followerCount',
        'DESC'
      );
    });

    it('should sort by revenue when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test'], {
        sortBy: 'revenue',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'store.totalRevenue',
        'DESC'
      );
    });

    it('should sort by products when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test'], {
        sortBy: 'products',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'store.productCount',
        'DESC'
      );
    });

    it('should sort by recent when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 20, ['test'], {
        sortBy: 'recent',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'store.createdAt',
        'DESC'
      );
    });

    it('should apply limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repository.searchStoreByName('test', 15, ['test']);

      expect(queryBuilder.limit).toHaveBeenCalledWith(15);
    });
  });

  describe('advancedStoreSearch', () => {
    it('should perform advanced search with all filters', async () => {
      queryBuilder.getCount!.mockResolvedValue(5);
      queryBuilder.getMany!.mockResolvedValue(mockStoreList);

      const result = await repository.advancedStoreSearch({
        query: 'gaming',
        minRevenue: 1000,
        maxRevenue: 10000,
        minProducts: 5,
        maxProducts: 50,
        minFollowers: 50,
        maxFollowers: 500,
        sortBy: 'revenue',
        sortOrder: 'DESC',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(5);
      expect(result.stores).toEqual(mockStoreList);
    });

    it('should filter by query text', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({ query: 'gaming' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(store.name) LIKE :query OR LOWER(store.description) LIKE :query)',
        { query: '%gaming%' }
      );
    });

    it('should filter by revenue range', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({
        minRevenue: 1000,
        maxRevenue: 10000,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.totalRevenue >= :minRevenue',
        {
          minRevenue: 1000,
        }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.totalRevenue <= :maxRevenue',
        {
          maxRevenue: 10000,
        }
      );
    });

    it('should filter by product count range', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({
        minProducts: 10,
        maxProducts: 100,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.productCount >= :minProducts',
        {
          minProducts: 10,
        }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.productCount <= :maxProducts',
        {
          maxProducts: 100,
        }
      );
    });

    it('should filter by follower count range', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({
        minFollowers: 50,
        maxFollowers: 500,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.followerCount >= :minFollowers',
        {
          minFollowers: 50,
        }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'store.followerCount <= :maxFollowers',
        {
          maxFollowers: 500,
        }
      );
    });

    it('should sort by name', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({
        sortBy: 'name',
        sortOrder: 'ASC',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('store.name', 'ASC');
    });

    it('should sort by revenue', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({
        sortBy: 'revenue',
        sortOrder: 'DESC',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'store.totalRevenue',
        'DESC'
      );
    });

    it('should apply pagination', async () => {
      queryBuilder.getCount!.mockResolvedValue(100);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({
        limit: 25,
        offset: 50,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(50);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('should use default pagination', async () => {
      queryBuilder.getCount!.mockResolvedValue(0);
      queryBuilder.getMany!.mockResolvedValue([]);

      await repository.advancedStoreSearch({});

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should count total before pagination', async () => {
      queryBuilder.getCount!.mockResolvedValue(42);
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await repository.advancedStoreSearch({ limit: 10 });

      expect(result.total).toBe(42);
    });
  });

  describe('findTopStoresByFollowers', () => {
    it('should return top stores by follower count', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockStoreList);

      const result = await repository.findTopStoresByFollowers(10);

      expect(result).toEqual(mockStoreList);
      expect(repository.find).toHaveBeenCalledWith({
        select: [
          'id',
          'name',
          'productCount',
          'followerCount',
          'totalRevenue',
          'orderCount',
        ],
        order: { followerCount: 'DESC' },
        take: 10,
      });
    });

    it('should use default limit', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      await repository.findTopStoresByFollowers();

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('findStoreStats', () => {
    it('should return store stats', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockStore);

      const result = await repository.findStoreStats('s1');

      expect(result).toEqual(mockStore);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 's1' },
        select: [
          'id',
          'name',
          'productCount',
          'followerCount',
          'totalRevenue',
          'orderCount',
        ],
      });
    });

    it('should return null when store not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findStoreStats('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAllWithStats', () => {
    it('should return all stores with stats', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockStoreList);

      const result = await repository.findAllWithStats();

      expect(result).toEqual(mockStoreList);
      expect(repository.find).toHaveBeenCalledWith({
        select: [
          'id',
          'name',
          'description',
          'productCount',
          'followerCount',
          'totalRevenue',
          'orderCount',
          'createdAt',
          'updatedAt',
        ],
      });
    });

    it('should return empty array when no stores', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findAllWithStats();

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle database errors gracefully', async () => {
      (repository.find as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.findTopByRevenue(10)).rejects.toThrow('DB error');
    });

    it('should handle empty search results', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      const result = await repository.searchStoreByName('nonexistent', 20, [
        'nonexistent',
      ]);

      expect(result).toEqual([]);
    });

    it('should handle stores with zero stats', async () => {
      const emptyStore = {
        ...mockStore,
        productCount: 0,
        followerCount: 0,
        totalRevenue: 0,
      };
      (repository.find as jest.Mock).mockResolvedValue([emptyStore]);

      const result = await repository.findTopByRevenue(10);

      expect(result[0].totalRevenue).toBe(0);
    });
  });
});
