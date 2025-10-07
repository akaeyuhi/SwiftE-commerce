import { Test } from '@nestjs/testing';
import { ProductQueryRepository } from 'src/modules/products/repositories/product-query.repository';
import { Product } from 'src/entities/store/product/product.entity';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';
/* eslint-disable camelcase*/

describe('ProductQueryRepository', () => {
  let repo: ProductQueryRepository;
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
      getRawMany: jest.fn(),
      getOne: jest.fn(),
    } as any;

    manager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      manager as unknown as EntityManager
    );

    const module = await Test.createTestingModule({
      providers: [
        ProductQueryRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repo = module.get<ProductQueryRepository>(ProductQueryRepository);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByStoreWithStats', () => {
    it('should return products with stats', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_description: 'Desc 1',
          p_averageRating: '4.5',
          p_reviewCount: 10,
          p_likeCount: 5,
          p_viewCount: 100,
          p_totalSales: 20,
          mainPhotoUrl: 'photo.jpg',
          minPrice: '10.00',
          maxPrice: '20.00',
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findAllByStoreWithStats('s1');

      expect(result).toEqual([
        {
          id: 'p1',
          name: 'Product 1',
          description: 'Desc 1',
          averageRating: 4.5,
          reviewCount: 10,
          likeCount: 5,
          viewCount: 100,
          totalSales: 20,
          mainPhotoUrl: 'photo.jpg',
          minPrice: 10,
          maxPrice: 20,
        },
      ]);
    });

    it('should filter by storeId', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findAllByStoreWithStats('s1');

      expect(queryBuilder.where).toHaveBeenCalledWith('p.storeId = :storeId', {
        storeId: 's1',
      });
    });

    it('should filter deleted products', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findAllByStoreWithStats('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.deletedAt IS NULL');
    });

    it('should only include main photos', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findAllByStoreWithStats('s1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'photos.isMain = :isMain',
        {
          isMain: true,
        }
      );
    });

    it('should calculate min and max prices', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findAllByStoreWithStats('s1');

      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'MIN(variants.price)',
        'minPrice'
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith(
        'MAX(variants.price)',
        'maxPrice'
      );
    });

    it('should group by product and photo', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      await repo.findAllByStoreWithStats('s1');

      expect(queryBuilder.groupBy).toHaveBeenCalledWith('p.id');
      expect(queryBuilder.addGroupBy).toHaveBeenCalledWith('photos.url');
    });

    it('should handle null averageRating', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          p_averageRating: null,
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findAllByStoreWithStats('s1');

      expect(result[0].averageRating).toBe(0);
    });

    it('should handle undefined prices', async () => {
      const rawProducts = [
        {
          p_id: 'p1',
          p_name: 'Product 1',
          minPrice: null,
          maxPrice: null,
        },
      ];

      queryBuilder.getRawMany!.mockResolvedValue(rawProducts);

      const result = await repo.findAllByStoreWithStats('s1');

      expect(result[0].minPrice).toBeUndefined();
      expect(result[0].maxPrice).toBeUndefined();
    });
  });

  describe('findProductDetail', () => {
    it('should load product with all relations', async () => {
      const mockProduct = {
        id: 'p1',
        name: 'Product',
        photos: [],
        variants: [],
        categories: [],
        reviews: [],
      } as unknown as Product;

      queryBuilder.getOne!.mockResolvedValue(mockProduct);

      const result = await repo.findProductDetail('p1');

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.photos',
        'photos'
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.variants',
        'variants'
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.categories',
        'categories'
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.reviews',
        'reviews'
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'reviews.user',
        'user'
      );
      expect(result).toEqual(mockProduct);
    });

    it('should select specific user fields', async () => {
      queryBuilder.getOne!.mockResolvedValue(null);

      await repo.findProductDetail('p1');

      expect(queryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([
          'p',
          'photos',
          'variants',
          'categories',
          'reviews',
          'user.id',
          'user.firstName',
          'user.lastName',
        ])
      );
    });

    it('should return null when product not found', async () => {
      queryBuilder.getOne!.mockResolvedValue(null);

      const result = await repo.findProductDetail('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty store results', async () => {
      queryBuilder.getRawMany!.mockResolvedValue([]);

      const result = await repo.findAllByStoreWithStats('s1');

      expect(result).toEqual([]);
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

      const result = await repo.findAllByStoreWithStats('s1');

      expect(result[0].minPrice).toBeUndefined();
      expect(result[0].maxPrice).toBeUndefined();
    });
  });
});
