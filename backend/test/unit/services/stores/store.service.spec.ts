import { Test, TestingModule } from '@nestjs/testing';
import { StoreService } from 'src/modules/store/store.service';
import { StoreRepository } from 'src/modules/store/store.repository';
import { StoreMapper } from 'src/modules/store/store.mapper';
import { BadRequestException } from '@nestjs/common';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { Store } from 'src/entities/store/store.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import {
  createMapperMock,
  createRepositoryMock,
  MockedMethods,
} from 'test/utils/helpers';

describe('StoreService', () => {
  let service: StoreService;
  let repo: Partial<MockedMethods<StoreRepository>>;
  let mapper: Partial<MockedMethods<StoreMapper>>;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    description: 'A test store',
    productCount: 10,
    followerCount: 100,
    totalRevenue: 5000,
    orderCount: 50,
    isActive: true,
    storeRoles: [],
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Store;

  beforeEach(async () => {
    repo = createRepositoryMock<StoreRepository>([
      'findStoreByName',
      'save',
      'findById',
      'findAllWithStats',
      'findStoreStats',
      'recalculateStats',
      'findTopByRevenue',
      'findTopByProductCount',
      'findTopStoresByFollowers',
      'recalculateAllStats',
      'findOne',
      'searchStoreByName',
      'advancedStoreSearch',
      'createQueryBuilder',
    ]);

    mapper = createMapperMock<StoreMapper>(['toListDto', 'toStatsDto']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: StoreRepository, useValue: repo },
        { provide: StoreMapper, useValue: mapper },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw when store name already in use', async () => {
      repo.findStoreByName!.mockResolvedValue(mockStore);

      await expect(
        service.create({ name: 'Test Store' } as CreateStoreDto)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ name: 'Test Store' } as CreateStoreDto)
      ).rejects.toThrow('Store name already in use');
      expect(repo.findStoreByName).toHaveBeenCalledWith('Test Store');
    });

    it('should create store when name is unused', async () => {
      repo.findStoreByName!.mockResolvedValue(null);
      const dto: CreateStoreDto = {
        name: 'New Store',
        description: 'Description',
      } as any;
      const entity = { name: 'New Store' } as Store;
      const saved = { id: 's2', name: 'New Store' } as Store;

      mapper.toEntity!.mockReturnValue(entity);
      repo.save!.mockResolvedValue(saved);
      mapper.toDto!.mockReturnValue(saved as any);

      const result = await service.create(dto);

      expect(repo.findStoreByName).toHaveBeenCalledWith('New Store');
      expect(mapper.toEntity).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(mapper.toDto).toHaveBeenCalledWith(saved);
      expect(result).toEqual(saved);
    });

    it('should handle case-sensitive store names', async () => {
      repo.findStoreByName!.mockResolvedValue(null);
      mapper.toEntity!.mockReturnValue({} as Store);
      repo.save!.mockResolvedValue(mockStore);
      mapper.toDto!.mockReturnValue(mockStore as any);

      await service.create({ name: 'TEST STORE' } as CreateStoreDto);

      expect(repo.findStoreByName).toHaveBeenCalledWith('TEST STORE');
    });
  });

  describe('hasUserStoreRole', () => {
    it('should throw when store not found', async () => {
      repo.findById!.mockResolvedValue(null);
      const storeRole = {
        store: { id: 's1' },
        user: { id: 'u1' },
      } as StoreRole;

      await expect(service.hasUserStoreRole(storeRole)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.hasUserStoreRole(storeRole)).rejects.toThrow(
        'Store not found'
      );
      expect(repo.findById).toHaveBeenCalledWith('s1');
    });

    it('should return true when matching role exists', async () => {
      const userRole = {
        id: 'r1',
        roleName: StoreRoles.ADMIN,
        user: { id: 'u1' },
        store: { id: 's1' },
      } as StoreRole;

      const storeEntity = {
        id: 's1',
        storeRoles: [
          { user: { id: 'u1' }, roleName: StoreRoles.ADMIN },
        ] as StoreRole[],
      } as Store;

      repo.findById!.mockResolvedValue(storeEntity);

      const result = await service.hasUserStoreRole(userRole);

      expect(result).toBe(true);
      expect(repo.findById).toHaveBeenCalledWith('s1');
    });

    it('should return false when no matching role present', async () => {
      const userRole = {
        id: 'r2',
        roleName: StoreRoles.GUEST,
        user: { id: 'u2' },
        store: { id: 's2' },
      } as StoreRole;

      const storeEntity = {
        id: 's2',
        storeRoles: [{ user: { id: 'someone' }, roleName: StoreRoles.ADMIN }],
      } as Store;

      repo.findById!.mockResolvedValue(storeEntity);

      const result = await service.hasUserStoreRole(userRole);

      expect(result).toBe(false);
    });

    it('should return false when user matches but role differs', async () => {
      const userRole = {
        roleName: StoreRoles.ADMIN,
        user: { id: 'u1' },
        store: { id: 's1' },
      } as StoreRole;

      const storeEntity = {
        id: 's1',
        storeRoles: [{ user: { id: 'u1' }, roleName: StoreRoles.GUEST }],
      } as Store;

      repo.findById!.mockResolvedValue(storeEntity);

      const result = await service.hasUserStoreRole(userRole);

      expect(result).toBe(false);
    });

    it('should return false when role matches but user differs', async () => {
      const userRole = {
        roleName: StoreRoles.ADMIN,
        user: { id: 'u1' },
        store: { id: 's1' },
      } as StoreRole;

      const storeEntity = {
        id: 's1',
        storeRoles: [{ user: { id: 'u2' }, roleName: StoreRoles.ADMIN }],
      } as Store;

      repo.findById!.mockResolvedValue(storeEntity);

      const result = await service.hasUserStoreRole(userRole);

      expect(result).toBe(false);
    });
  });

  describe('findAllWithStats', () => {
    it('should return all stores with stats', async () => {
      const stores = [mockStore, { ...mockStore, id: 's2' }];

      repo.findAllWithStats!.mockResolvedValue(stores);
      mapper.toListDto!.mockImplementation(
        (store) => ({ id: store.id, name: store.name }) as any
      );

      const result = await service.findAllWithStats();

      expect(result).toHaveLength(2);
      expect(repo.findAllWithStats).toHaveBeenCalled();
      expect(mapper.toListDto).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no stores', async () => {
      repo.findAllWithStats!.mockResolvedValue([]);

      const result = await service.findAllWithStats();

      expect(result).toEqual([]);
    });
  });

  describe('getStoreStats', () => {
    it('should return store stats', async () => {
      const statsDto = { id: 's1', productCount: 10, followerCount: 100 };
      repo.findStoreStats!.mockResolvedValue(mockStore);
      mapper.toStatsDto!.mockReturnValue(statsDto as any);

      const result = await service.getStoreStats('s1');

      expect(result).toEqual(statsDto);
      expect(repo.findStoreStats).toHaveBeenCalledWith('s1');
      expect(mapper.toStatsDto).toHaveBeenCalledWith(mockStore);
    });

    it('should throw when store not found', async () => {
      repo.findStoreStats!.mockResolvedValue(null);

      await expect(service.getStoreStats('nonexistent')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.getStoreStats('nonexistent')).rejects.toThrow(
        'Store not found'
      );
    });
  });

  describe('recalculateStoreStats', () => {
    it('should recalculate store statistics', async () => {
      repo.recalculateStats!.mockResolvedValue(undefined);

      await service.recalculateStoreStats('s1');

      expect(repo.recalculateStats).toHaveBeenCalledWith('s1');
    });
  });

  describe('getTopStoresByRevenue', () => {
    it('should return top stores by revenue with default limit', async () => {
      const stores = [mockStore];

      repo.findTopByRevenue!.mockResolvedValue(stores);
      mapper.toStatsDto!.mockImplementation(
        (store) => ({ id: store.id, totalRevenue: store.totalRevenue }) as any
      );

      const result = await service.getTopStoresByRevenue();

      expect(result).toHaveLength(1);
      expect(repo.findTopByRevenue).toHaveBeenCalledWith(10);
    });

    it('should accept custom limit', async () => {
      repo.findTopByRevenue!.mockResolvedValue([]);
      mapper.toStatsDto!.mockReturnValue({} as any);

      await service.getTopStoresByRevenue(25);

      expect(repo.findTopByRevenue).toHaveBeenCalledWith(25);
    });
  });

  describe('getTopStoresByProducts', () => {
    it('should return top stores by product count', async () => {
      const stores = [mockStore];
      repo.findTopByProductCount!.mockResolvedValue(stores);
      mapper.toStatsDto!.mockReturnValue({ id: 's1' } as any);

      const result = await service.getTopStoresByProducts(15);

      expect(result).toHaveLength(1);
      expect(repo.findTopByProductCount).toHaveBeenCalledWith(15);
    });
  });

  describe('getTopStoresByFollowers', () => {
    it('should return top stores by follower count', async () => {
      const stores = [mockStore];
      repo.findTopStoresByFollowers!.mockResolvedValue(stores);
      mapper.toStatsDto!.mockReturnValue({ id: 's1' } as any);

      const result = await service.getTopStoresByFollowers(20);

      expect(result).toHaveLength(1);
      expect(repo.findTopStoresByFollowers).toHaveBeenCalledWith(20);
    });
  });

  describe('recalculateAllStoreStats', () => {
    it('should recalculate all store statistics', async () => {
      repo.recalculateAllStats!.mockResolvedValue(undefined);

      await service.recalculateAllStoreStats();

      expect(repo.recalculateAllStats).toHaveBeenCalled();
    });
  });

  describe('checkStoreDataHealth', () => {
    it('should return health check with matching counts', async () => {
      const storeWithProducts = {
        ...mockStore,
        products: [
          { id: 'p1', deletedAt: null },
          { id: 'p2', deletedAt: null },
        ],
        productCount: 2,
      } as unknown as Store;

      repo.findOne!.mockResolvedValue(storeWithProducts);

      const result = await service.checkStoreDataHealth('s1');

      expect(result).toEqual({
        storeId: 's1',
        health: {
          productCount: {
            cached: 2,
            actual: 2,
            match: true,
          },
        },
        needsRecalculation: false,
      });
    });

    it('should detect mismatched product counts', async () => {
      const storeWithProducts = {
        ...mockStore,
        products: [{ id: 'p1', deletedAt: null }],
        productCount: 5, // Cached value is wrong
      } as unknown as Store;

      repo.findOne!.mockResolvedValue(storeWithProducts);

      const result = await service.checkStoreDataHealth('s1');

      expect(result.health.productCount.match).toBe(false);
      expect(result.needsRecalculation).toBe(true);
    });

    it('should exclude soft-deleted products from actual count', async () => {
      const storeWithProducts = {
        ...mockStore,
        products: [
          { id: 'p1', deletedAt: null },
          { id: 'p2', deletedAt: new Date() }, // Soft deleted
        ],
        productCount: 1,
      } as Store;

      repo.findOne!.mockResolvedValue(storeWithProducts);

      const result = await service.checkStoreDataHealth('s1');

      expect(result.health.productCount.actual).toBe(1);
      expect(result.health.productCount.match).toBe(true);
    });

    it('should throw when store not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.checkStoreDataHealth('nonexistent')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle stores with no products', async () => {
      const storeNoProducts = {
        ...mockStore,
        products: [],
        productCount: 0,
      } as Store;

      repo.findOne!.mockResolvedValue(storeNoProducts);

      const result = await service.checkStoreDataHealth('s1');

      expect(result.health.productCount.actual).toBe(0);
      expect(result.health.productCount.cached).toBe(0);
    });
  });

  describe('searchStoresByName', () => {
    it('should search stores by name', async () => {
      const searchResults = [
        {
          id: 's1',
          name: 'Gaming Store',
          description: 'Best gaming products',
          productCount: 50,
          followerCount: 200,
          totalRevenue: 10000,
          orderCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repo.searchStoreByName!.mockResolvedValue(searchResults as any);

      const result = await service.searchStoresByName('gaming', 20);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Gaming Store');
      expect(result[0].matchType).toBeDefined();
      expect(repo.searchStoreByName).toHaveBeenCalledWith(
        'gaming',
        20,
        ['gaming'],
        undefined
      );
    });

    it('should throw when query is empty', async () => {
      await expect(service.searchStoresByName('')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.searchStoresByName('   ')).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should split multi-word queries', async () => {
      repo.searchStoreByName!.mockResolvedValue([]);

      await service.searchStoresByName('gaming store best');

      expect(repo.searchStoreByName).toHaveBeenCalledWith(
        'gaming store best',
        20,
        ['gaming', 'store', 'best'],
        undefined
      );
    });

    it('should pass search options', async () => {
      repo.searchStoreByName!.mockResolvedValue([]);

      await service.searchStoresByName('test', 15, {
        sortBy: 'followers',
        minFollowers: 100,
        minProducts: 10,
      });

      expect(repo.searchStoreByName).toHaveBeenCalledWith(
        'test',
        15,
        ['test'],
        { sortBy: 'followers', minFollowers: 100, minProducts: 10 }
      );
    });

    it('should determine exact match type', async () => {
      const searchResults = [
        {
          id: 's1',
          name: 'Gaming',
          description: '',
          productCount: 10,
          followerCount: 50,
          totalRevenue: 1000,
          orderCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repo.searchStoreByName!.mockResolvedValue(searchResults as any);

      const result = await service.searchStoresByName('gaming');

      expect(result[0].matchType).toBe('exact');
    });

    it('should determine startsWith match type', async () => {
      const searchResults = [
        {
          id: 's1',
          name: 'Gaming Store',
          description: '',
          productCount: 10,
          followerCount: 50,
          totalRevenue: 1000,
          orderCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repo.searchStoreByName!.mockResolvedValue(searchResults as any);

      const result = await service.searchStoresByName('gam');

      expect(result[0].matchType).toBe('startsWith');
    });

    it('should determine contains match type', async () => {
      const searchResults = [
        {
          id: 's1',
          name: 'Best Gaming Store',
          description: '',
          productCount: 10,
          followerCount: 50,
          totalRevenue: 1000,
          orderCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repo.searchStoreByName!.mockResolvedValue(searchResults as any);

      const result = await service.searchStoresByName('gaming');

      expect(result[0].matchType).toBe('contains');
    });
  });

  describe('advancedStoreSearch', () => {
    it('should perform advanced search with filters', async () => {
      const searchResult = {
        total: 5,
        stores: [
          {
            id: 's1',
            name: 'Store',
            description: 'Desc',
            productCount: 10,
            followerCount: 100,
            totalRevenue: '5000',
            orderCount: 50,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      repo.advancedStoreSearch!.mockResolvedValue(searchResult as any);

      const result = await service.advancedStoreSearch({
        query: 'store',
        minRevenue: 1000,
        maxRevenue: 10000,
        limit: 20,
      });

      expect(result.total).toBe(5);
      expect(result.stores).toHaveLength(1);
      expect(result.stores[0].totalRevenue).toBe(5000);
    });

    it('should handle totalRevenue as string', async () => {
      const searchResult = {
        total: 1,
        stores: [
          {
            id: 's1',
            name: 'Store',
            totalRevenue: '12345.67',
            productCount: 10,
            followerCount: 100,
            orderCount: 50,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      repo.advancedStoreSearch!.mockResolvedValue(searchResult as any);

      const result = await service.advancedStoreSearch({});

      expect(result.stores[0].totalRevenue).toBe(12345.67);
    });
  });

  describe('autocompleteStores', () => {
    it('should return autocomplete suggestions', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'Gaming Store', followerCount: 500 },
          { id: 's2', name: 'Gaming Hub', followerCount: 300 },
        ]),
      };

      repo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.autocompleteStores('gam', 10);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Gaming Store');
      expect(qb.where).toHaveBeenCalledWith('LOWER(store.name) LIKE :query', {
        query: 'gam%',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('store.followerCount', 'DESC');
    });

    it('should return empty array for queries shorter than 2 chars', async () => {
      const result = await service.autocompleteStores('a');

      expect(result).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return empty array for empty query', async () => {
      const result = await service.autocompleteStores('');

      expect(result).toEqual([]);
    });

    it('should handle null followerCount', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 's1', name: 'Store', followerCount: null },
          ]),
      };

      repo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.autocompleteStores('sto');

      expect(result[0].followerCount).toBe(0);
    });
  });
});
