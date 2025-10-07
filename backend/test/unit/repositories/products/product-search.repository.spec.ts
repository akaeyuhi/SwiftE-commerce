import { Test } from '@nestjs/testing';
import { ProductSearchRepository } from 'src/modules/products/repositories/product-search.repository';
import { Product } from 'src/entities/store/product/product.entity';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';
/* eslint-disable camelcase*/

describe('ProductSearchRepository', () => {
  let repo: ProductSearchRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let manager: Partial<MockedMethods<EntityManager>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<Product>>>;

  beforeEach(async () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
    } as any;

    manager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      manager as unknown as EntityManager
    );

    const module = await Test.createTestingModule({
      providers: [
        ProductSearchRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repo = module.get<ProductSearchRepository>(ProductSearchRepository);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('should search with single term', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Laptop',
          p_description: 'Gaming laptop',
          mainPhotoUrl: 'photo.jpg',
          relevanceScore: 500,
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.searchProducts('s1', 'laptop', 20, ['laptop']);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: '%laptop%' }
      );
      expect(result).toHaveLength(1);
    });

    it('should search with multiple terms', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'gaming laptop', 20, [
        'gaming',
        'laptop',
      ]);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(p.name) LIKE :term0 OR LOWER(p.description) LIKE :term0)',
        { term0: '%gaming%' }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(p.name) LIKE :term1 OR LOWER(p.description) LIKE :term1)',
        { term1: '%laptop%' }
      );
    });

    it('should calculate relevance score', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop']);

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('CASE'),
        'relevanceScore'
      );
      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'exactQuery',
        'laptop'
      );
      expect(queryBuilder.setParameter).toHaveBeenCalledWith(
        'startsWithQuery',
        'laptop%'
      );
    });

    it('should boost by engagement metrics', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop']);

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('p.viewCount * 0.1'),
        'relevanceScore'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('p.likeCount * 0.5'),
        'relevanceScore'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('p.totalSales * 2'),
        'relevanceScore'
      );
    });

    it('should filter by category', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        categoryId: 'c1',
      });

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'p.categories',
        'category'
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.id = :categoryId',
        {
          categoryId: 'c1',
        }
      );
    });

    it('should filter by minimum rating', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        minRating: 4,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.averageRating >= :minRating',
        {
          minRating: 4,
        }
      );
    });

    it('should filter by price range', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        minPrice: 500,
        maxPrice: 2000,
      });

      expect(queryBuilder.setParameter).toHaveBeenCalledWith('minPrice', 500);
      expect(queryBuilder.setParameter).toHaveBeenCalledWith('maxPrice', 2000);
      expect(queryBuilder.having).toHaveBeenCalledWith(
        'MIN(variants.price) >= :minPrice AND MAX(variants.price) <= :maxPrice'
      );
    });

    it('should sort by relevance by default', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop']);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'relevanceScore',
        'DESC'
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'p.viewCount',
        'DESC'
      );
    });

    it('should sort by views when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        sortBy: 'views',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.viewCount', 'DESC');
    });

    it('should sort by sales when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        sortBy: 'sales',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.totalSales', 'DESC');
    });

    it('should sort by rating when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        sortBy: 'rating',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'p.averageRating',
        'DESC'
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'p.reviewCount',
        'DESC'
      );
    });

    it('should sort by price when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        sortBy: 'price',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'MIN(variants.price)',
        'ASC'
      );
    });

    it('should sort by recent when specified', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop'], {
        sortBy: 'recent',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.createdAt', 'DESC');
    });

    it('should apply limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 15, ['laptop']);

      expect(queryBuilder.limit).toHaveBeenCalledWith(15);
    });

    it('should filter deleted products', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', 'laptop', 20, ['laptop']);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.deletedAt IS NULL');
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search with filters', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(5);

      const result = await repo.advancedSearch({
        storeId: 's1',
        query: 'laptop',
        minPrice: 500,
        maxPrice: 2000,
        minRating: 4,
        categoryIds: ['c1', 'c2'],
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(5);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(p.name) LIKE :query OR LOWER(p.description) LIKE :query)',
        { query: '%laptop%' }
      );
    });

    it('should filter by multiple categories', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(0);

      await repo.advancedSearch({
        storeId: 's1',
        categoryIds: ['c1', 'c2', 'c3'],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.id IN (:...categoryIds)',
        { categoryIds: ['c1', 'c2', 'c3'] }
      );
    });

    it('should filter by rating range', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(0);

      await repo.advancedSearch({
        storeId: 's1',
        minRating: 3,
        maxRating: 5,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.averageRating >= :minRating',
        {
          minRating: 3,
        }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.averageRating <= :maxRating',
        {
          maxRating: 5,
        }
      );
    });

    it('should filter in-stock products', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(0);

      await repo.advancedSearch({
        storeId: 's1',
        inStock: true,
      });

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'variants.inventory',
        'inventory'
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.quantity > 0'
      );
    });

    it('should apply pagination', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(100);

      await repo.advancedSearch({
        storeId: 's1',
        limit: 25,
        offset: 50,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(50);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('should apply sorting with order', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(0);

      await repo.advancedSearch({
        storeId: 's1',
        sortBy: 'price',
        sortOrder: 'ASC',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'MIN(variants.price)',
        'ASC'
      );
    });

    it('should count total before pagination', async () => {
      queryBuilder.clone!.mockReturnValue(queryBuilder as any);
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(42);

      const result = await repo.advancedSearch({
        storeId: 's1',
        limit: 10,
      });

      expect(queryBuilder.clone).toHaveBeenCalled();
      expect(result.total).toBe(42);
    });

    it('should use default pagination values', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);
      queryBuilder.getCount!.mockResolvedValue(0);

      await repo.advancedSearch({ storeId: 's1' });

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe('autocompleteProducts', () => {
    it('should return autocomplete suggestions', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Laptop Pro',
          photoUrl: 'photo.jpg',
          minPrice: '1000',
        },
        {
          p_id: 'p2',
          p_name: 'Laptop Air',
          photoUrl: 'photo2.jpg',
          minPrice: '800',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.autocompleteProducts('s1', 'lap', 10);

      expect(result).toEqual(rawProducts);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(p.name) LIKE :query',
        {
          query: 'lap%',
        }
      );
    });

    it('should use starts-with matching', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.autocompleteProducts('s1', 'lap', 10);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(p.name) LIKE :query',
        {
          query: 'lap%', // Starts with, not contains
        }
      );
    });

    it('should order by view count', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.autocompleteProducts('s1', 'lap', 10);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.viewCount', 'DESC');
    });

    it('should apply limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.autocompleteProducts('s1', 'lap', 5);

      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should use default limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.autocompleteProducts('s1', 'lap');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should filter by store', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.autocompleteProducts('s1', 'lap');

      expect(queryBuilder.where).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
    });

    it('should exclude deleted products', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.autocompleteProducts('s1', 'lap');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.deletedAt IS NULL');
    });
  });

  describe('edge cases', () => {
    it('should handle empty search results', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      const result = await repo.searchProducts('s1', 'nonexistent', 20, [
        'nonexistent',
      ]);

      expect(result).toEqual([]);
    });

    it('should handle special characters in query', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.searchProducts('s1', `laptop's`, 20, [`laptop's`]);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      queryBuilder.getRawMany!.mockRejectedValue(new Error('Database error'));

      await expect(
        repo.searchProducts('s1', 'laptop', 20, ['laptop'])
      ).rejects.toThrow('Database error');
    });
  });
});
