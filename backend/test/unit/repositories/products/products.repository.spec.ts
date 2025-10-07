import { Test } from '@nestjs/testing';
import { Product } from 'src/entities/store/product/product.entity';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { ProductRepository } from 'src/modules/products/repositories/products.repository';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let manager: Partial<MockedMethods<EntityManager>>;
  let queryBuilder: Partial<MockedMethods<SelectQueryBuilder<Product>>>;

  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    description: 'Description',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    } as any;

    manager = createMock<EntityManager>(['query']);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      manager as unknown as EntityManager
    );

    const module = await Test.createTestingModule({
      providers: [
        ProductRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repo = module.get<ProductRepository>(ProductRepository);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(queryBuilder as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllByStore', () => {
    it('should build correct query with store relations', async () => {
      queryBuilder.getMany!.mockResolvedValue([mockProduct]);

      const result = await repo.findAllByStore('s1');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.store',
        's'
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.photos',
        'photos'
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('s.id = :storeId', {
        storeId: 's1',
      });
      expect(result).toEqual([mockProduct]);
    });

    it('should return empty array when no products found', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await repo.findAllByStore('s1');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      queryBuilder.getMany!.mockRejectedValue(new Error('Database error'));

      await expect(repo.findAllByStore('s1')).rejects.toThrow('Database error');
    });
  });

  describe('findWithRelations', () => {
    it('should build correct query with all relations', async () => {
      queryBuilder.getOne!.mockResolvedValue(mockProduct);

      const result = await repo.findWithRelations('p1');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('p');
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
      expect(queryBuilder.where).toHaveBeenCalledWith('p.id = :id', {
        id: 'p1',
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      queryBuilder.getOne!.mockResolvedValue(null);

      const result = await repo.findWithRelations('nonexistent');

      expect(result).toBeNull();
    });

    it('should load all relation types', async () => {
      queryBuilder.getOne!.mockResolvedValue(mockProduct);

      await repo.findWithRelations('p1');

      const relations = ['photos', 'variants', 'categories', 'reviews'];
      relations.forEach((rel) => {
        expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
          `p.${rel}`,
          rel
        );
      });
    });
  });

  describe('findProductsByCategory', () => {
    it('should filter by category without store filter', async () => {
      queryBuilder.getMany!.mockResolvedValue([mockProduct]);

      const result = await repo.findProductsByCategory('c1');

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith('p.categories', 'c');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.store',
        's'
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'p.photos',
        'photos'
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('c.id = :categoryId', {
        categoryId: 'c1',
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual([mockProduct]);
    });

    it('should filter by category with store filter', async () => {
      queryBuilder.getMany!.mockResolvedValue([mockProduct]);

      const result = await repo.findProductsByCategory('c1', 's1');

      expect(queryBuilder.where).toHaveBeenCalledWith('c.id = :categoryId', {
        categoryId: 'c1',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('s.id = :storeId', {
        storeId: 's1',
      });
      expect(result).toEqual([mockProduct]);
    });

    it('should return empty array when no products in category', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await repo.findProductsByCategory('c1');

      expect(result).toEqual([]);
    });

    it('should handle multiple products in same category', async () => {
      const products = [mockProduct, { ...mockProduct, id: 'p2' }];
      queryBuilder.getMany!.mockResolvedValue(products);

      const result = await repo.findProductsByCategory('c1');

      expect(result).toHaveLength(2);
    });
  });

  describe('recalculateStats', () => {
    it('should execute stats recalculation query', async () => {
      manager.query!.mockResolvedValue([]);

      await repo.recalculateStats('p1');

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products p'),
        ['p1']
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('review_count'),
        ['p1']
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('average_rating'),
        ['p1']
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('like_count'),
        ['p1']
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('total_sales'),
        ['p1']
      );
    });

    it('should handle stats recalculation errors', async () => {
      manager.query!.mockRejectedValue(new Error('Query failed'));

      await expect(repo.recalculateStats('p1')).rejects.toThrow('Query failed');
    });

    it('should use COALESCE for total_sales', async () => {
      manager.query!.mockResolvedValue([]);

      await repo.recalculateStats('p1');

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE'),
        ['p1']
      );
    });

    it('should handle products with no reviews/likes/sales', async () => {
      manager.query!.mockResolvedValue([]);

      await expect(repo.recalculateStats('p1')).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty product ID', async () => {
      queryBuilder.getOne!.mockResolvedValue(null);

      const result = await repo.findWithRelations('');

      expect(result).toBeNull();
    });

    it('should handle special characters in category ID', async () => {
      queryBuilder.getMany!.mockResolvedValue([]);

      await repo.findProductsByCategory("c'1");

      expect(queryBuilder.where).toHaveBeenCalledWith('c.id = :categoryId', {
        categoryId: "c'1",
      });
    });

    it('should handle multiple store queries', async () => {
      queryBuilder.getMany!.mockResolvedValue([mockProduct]);

      await repo.findAllByStore('s1');
      await repo.findAllByStore('s2');

      expect(queryBuilder.where).toHaveBeenCalledTimes(2);
      expect(queryBuilder.where).toHaveBeenNthCalledWith(1, 's.id = :storeId', {
        storeId: 's1',
      });
      expect(queryBuilder.where).toHaveBeenNthCalledWith(2, 's.id = :storeId', {
        storeId: 's2',
      });
    });
  });
});
