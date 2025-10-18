import { Test } from '@nestjs/testing';
import { ProductRankingRepository } from 'src/modules/products/repositories/product-ranking.repository';
import { Product } from 'src/entities/store/product/product.entity';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('ProductRankingRepository', () => {
  let repo: ProductRankingRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let manager: Partial<MockedMethods<EntityManager>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<Product>>>;

  beforeEach(async () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    } as any;

    manager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      manager as unknown as EntityManager
    );

    const module = await Test.createTestingModule({
      providers: [
        ProductRankingRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repo = module.get<ProductRankingRepository>(ProductRankingRepository);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findTopProductsByViews', () => {
    it('should return top products by view count', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_viewCount: 1000,
          mainPhotoUrl: 'photo1.jpg',
          minPrice: '10.00',
        },
        {
          p_id: 'p2',
          p_name: 'Product 2',
          p_viewCount: 500,
          mainPhotoUrl: 'photo2.jpg',
          minPrice: '20.00',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTopProductsByViews('s1', 10);

      expect(result).toEqual(rawProducts);
      expect(queryBuilder.where).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.deletedAt IS NULL');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.viewCount > 0');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.viewCount', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 10', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByViews('s1');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should filter out products with zero views', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByViews('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.viewCount > 0');
    });

    it('should only select main photos', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByViews('s1');

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'p.photos',
        'photos',
        'photos.isMain = true'
      );
    });

    it('should group by product and photo', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByViews('s1');

      expect(queryBuilder.groupBy).toHaveBeenCalledWith('p.id');
      expect(queryBuilder.addGroupBy).toHaveBeenCalledWith('photos.url');
    });

    it('should handle custom limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByViews('s1', 25);

      expect(queryBuilder.limit).toHaveBeenCalledWith(25);
    });
  });

  describe('findTopProductsBySales', () => {
    it('should return top products by sales count', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_totalSales: 100,
          mainPhotoUrl: 'photo1.jpg',
        },
        {
          p_id: 'p2',
          p_name: 'Product 2',
          p_totalSales: 50,
          mainPhotoUrl: 'photo2.jpg',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTopProductsBySales('s1', 10);

      expect(result).toEqual(rawProducts);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.totalSales > 0');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.totalSales', 'DESC');
    });

    it('should filter out products with no sales', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsBySales('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.totalSales > 0');
    });

    it('should apply store filter', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsBySales('s1');

      expect(queryBuilder.where).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
    });

    it('should use default limit', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsBySales('s1');

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('findTopRatedProducts', () => {
    it('should return top rated products', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_averageRating: '4.8',
          p_reviewCount: 100,
          mainPhotoUrl: 'photo1.jpg',
        },
        {
          p_id: 'p2',
          p_name: 'Product 2',
          p_averageRating: '4.5',
          p_reviewCount: 50,
          mainPhotoUrl: 'photo2.jpg',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTopRatedProducts('s1', 10, 5);

      expect(result).toEqual(rawProducts);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.reviewCount >= :minReviews',
        {
          minReviews: 5,
        }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.averageRating IS NOT NULL'
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'p.averageRating',
        'DESC'
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'p.reviewCount',
        'DESC'
      );
    });

    it('should use default minReviews of 5', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopRatedProducts('s1', 10);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.reviewCount >= :minReviews',
        {
          minReviews: 5,
        }
      );
    });

    it('should filter out products without ratings', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopRatedProducts('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.averageRating IS NOT NULL'
      );
    });

    it('should use review count as tiebreaker', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopRatedProducts('s1');

      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'p.reviewCount',
        'DESC'
      );
    });

    it('should allow custom minReviews threshold', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopRatedProducts('s1', 10, 20);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.reviewCount >= :minReviews',
        {
          minReviews: 20,
        }
      );
    });
  });

  describe('findTopProductsByConversion', () => {
    it('should return top products by conversion rate', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_viewCount: 100,
          p_totalSales: 20,
          conversionRate: 0.2,
          mainPhotoUrl: 'photo1.jpg',
        },
        {
          p_id: 'p2',
          p_name: 'Product 2',
          p_viewCount: 200,
          p_totalSales: 30,
          conversionRate: 0.15,
          mainPhotoUrl: 'photo2.jpg',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTopProductsByConversion('s1', 10, 50);

      expect(result).toEqual(rawProducts);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.viewCount >= :minViews',
        {
          minViews: 50,
        }
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.totalSales > 0');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'conversionRate',
        'DESC'
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'p.totalSales',
        'DESC'
      );
    });

    it('should calculate conversion rate', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByConversion('s1');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        '(CAST(p.totalSales AS FLOAT) / NULLIF(p.viewCount, 0))',
        'conversionRate'
      );
    });

    it('should use default minViews of 50', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByConversion('s1', 10);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.viewCount >= :minViews',
        {
          minViews: 50,
        }
      );
    });

    it('should filter products without sales', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByConversion('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.totalSales > 0');
    });

    it('should use sales as tiebreaker', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByConversion('s1');

      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'p.totalSales',
        'DESC'
      );
    });

    it('should handle NULLIF for zero views', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTopProductsByConversion('s1');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('NULLIF'),
        'conversionRate'
      );
    });
  });

  describe('findTrendingProducts', () => {
    it('should return trending products with recent activity', async () => {
      const dateThreshold = '2025-01-01';
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_createdAt: '2024-12-01',
          recentViews: '100',
          recentLikes: '10',
          recentSales: '5',
          mainPhotoUrl: 'photo1.jpg',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTrendingProducts('s1', dateThreshold);

      expect(result).toEqual(rawProducts);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'analytics_events',
        'events',
        'events.product_id = p.id AND events.created_at >= :dateThreshold',
        { dateThreshold }
      );
    });

    it('should count recent views', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTrendingProducts('s1', '2025-01-01');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        `COUNT(CASE WHEN events.event_type = 'view' THEN 1 END)`,
        'recentViews'
      );
    });

    it('should count recent likes', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTrendingProducts('s1', '2025-01-01');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        `COUNT(CASE WHEN events.event_type = 'like' THEN 1 END)`,
        'recentLikes'
      );
    });

    it('should count recent sales', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTrendingProducts('s1', '2025-01-01');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        `COUNT(CASE WHEN events.event_type = 'purchase' THEN 1 END)`,
        'recentSales'
      );
    });

    it('should filter by store', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTrendingProducts('s1', '2025-01-01');

      expect(queryBuilder.where).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
    });

    it('should exclude deleted products', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTrendingProducts('s1', '2025-01-01');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.deletedAt IS NULL');
    });

    it('should include product creation date', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findTrendingProducts('s1', '2025-01-01');

      expect(queryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining(['p.createdAt'])
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      const result = await repo.findTopProductsByViews('s1');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      queryBuilder.getRawMany!.mockRejectedValue(new Error('Database error'));

      await expect(repo.findTopProductsByViews('s1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle products without photos', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product',
          mainPhotoUrl: null,
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTopProductsByViews('s1');

      expect(result[0].mainPhotoUrl).toBeNull();
    });

    it('should handle products without variants', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product',
          minPrice: null,
          maxPrice: null,
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findTopProductsBySales('s1');

      expect(result[0].minPrice).toBeNull();
      expect(result[0].maxPrice).toBeNull();
    });
  });
});
