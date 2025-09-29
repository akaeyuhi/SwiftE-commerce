import { CartItemRepository } from 'src/modules/store/cart/cart-item/cart-item.repository';
import { CartItem } from 'src/entities/store/cart/cart-item.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from '../utils/helpers';
import { Test, TestingModule } from '@nestjs/testing';

describe('CartItemRepository', () => {
  let repository: CartItemRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockCartItem: CartItem = {
    id: 'item1',
    cart: { id: 'cart1' },
    variant: { id: 'variant1', name: 'Test Variant' },
    quantity: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as CartItem;

  const mockCartItemList: CartItem[] = [
    mockCartItem,
    {
      id: 'item2',
      cart: { id: 'cart1' },
      variant: { id: 'variant2', name: 'Test Variant 2' },
      quantity: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as unknown as CartItem,
  ];

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartItemRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<CartItemRepository>(CartItemRepository);

    // Mock inherited Repository methods
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOneBy').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'save').mockImplementation(jest.fn());
    jest.spyOn(repository, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repository, 'update').mockImplementation(jest.fn());

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should extend BaseRepository', () => {
      expect(repository).toBeInstanceOf(CartItemRepository);
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
    });

    it('should initialize with DataSource', () => {
      expect(dataSource.createEntityManager).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByCart', () => {
    it('should find all items for a cart with variant relations', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockCartItemList);

      const result = await repository.findByCart('cart1');

      expect(result).toEqual(mockCartItemList);
      expect(repository.find).toHaveBeenCalledWith({
        where: { cart: { id: 'cart1' } },
        relations: ['variant'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when no items found', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByCart('empty-cart');

      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { cart: { id: 'empty-cart' } },
        relations: ['variant'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      (repository.find as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findByCart('cart1')).rejects.toThrow(dbError);
    });

    it('should order items by creation date ascending', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockCartItemList);

      await repository.findByCart('cart1');

      const findCall = (repository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.order).toEqual({ createdAt: 'ASC' });
    });
  });

  describe('findWithRelations', () => {
    it('should find item with cart and variant relations', async () => {
      const itemWithRelations = {
        ...mockCartItem,
        cart: { id: 'cart1', name: 'Test Cart' },
        variant: { id: 'variant1', name: 'Test Variant', price: 100 },
      } as unknown as CartItem;

      (repository.findOne as jest.Mock).mockResolvedValue(itemWithRelations);

      const result = await repository.findWithRelations('item1');

      expect(result).toEqual(itemWithRelations);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'item1' },
        relations: ['cart', 'variant'],
      });
    });

    it('should return null when item not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findWithRelations('nonexistent');

      expect(result).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        relations: ['cart', 'variant'],
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query execution failed');
      (repository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findWithRelations('item1')).rejects.toThrow(
        dbError
      );
    });
  });

  describe('findByCartAndVariant', () => {
    it('should find item by cart and variant combination', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockCartItem);

      const result = await repository.findByCartAndVariant('cart1', 'variant1');

      expect(result).toEqual(mockCartItem);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { cart: { id: 'cart1' }, variant: { id: 'variant1' } },
      });
    });

    it('should return null when combination not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByCartAndVariant(
        'cart1',
        'nonexistent-variant'
      );

      expect(result).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          cart: { id: 'cart1' },
          variant: { id: 'nonexistent-variant' },
        },
      });
    });

    it('should handle different cart and variant combinations', async () => {
      const testCombinations = [
        ['cart1', 'variant1'],
        ['cart2', 'variant1'],
        ['cart1', 'variant2'],
      ];

      (repository.findOne as jest.Mock).mockResolvedValue(mockCartItem);

      for (const [cartId, variantId] of testCombinations) {
        await repository.findByCartAndVariant(cartId, variantId);

        expect(repository.findOne).toHaveBeenCalledWith({
          where: { cart: { id: cartId }, variant: { id: variantId } },
        });
      }

      expect(repository.findOne).toHaveBeenCalledTimes(testCombinations.length);
    });

    it('should handle database constraint errors', async () => {
      const constraintError = new Error('Foreign key constraint violation');
      (repository.findOne as jest.Mock).mockRejectedValue(constraintError);

      await expect(
        repository.findByCartAndVariant('cart1', 'variant1')
      ).rejects.toThrow(constraintError);
    });
  });

  describe('inherited BaseRepository methods', () => {
    it('should have all BaseRepository methods available', () => {
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });

    it('should delegate to TypeORM Repository methods', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockCartItem);

      await repository.findById('item1');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'item1' });
    });
  });

  describe('error handling', () => {
    it('should handle malformed cart IDs', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByCart('');

      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { cart: { id: '' } },
        relations: ['variant'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should handle concurrent findByCart operations', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockCartItemList);

      const concurrentCalls = Array.from({ length: 3 }, () =>
        repository.findByCart('cart1')
      );

      const results = await Promise.all(concurrentCalls);

      expect(results).toHaveLength(3);
      expect(results.every((result) => result === mockCartItemList)).toBe(true);
      expect(repository.find).toHaveBeenCalledTimes(3);
    });
  });

  describe('integration with TypeORM', () => {
    it('should properly use DataSource and EntityManager', () => {
      expect(repository['manager']).toBe(entityManager);
      expect(dataSource.createEntityManager).toHaveBeenCalledTimes(1);
    });
  });
});
