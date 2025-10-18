import { Test, TestingModule } from '@nestjs/testing';
import { CartRepository } from 'src/modules/store/cart/cart.repository';
import { ShoppingCart } from 'src/entities/store/cart/cart.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/unit/helpers';

describe('CartRepository', () => {
  let repository: CartRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockCart: ShoppingCart = {
    id: 'c1',
    user: { id: 'user-1' },
    store: { id: 'stores-1' },
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ShoppingCart;

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<CartRepository>(CartRepository);

    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  describe('findByUserAndStore', () => {
    it('should find one cart by user and stores with relations', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockCart);

      const result = await repository.findByUserAndStore('user-1', 'stores-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'user-1' }, store: { id: 'stores-1' } },
        relations: ['store', 'items', 'items.variant'],
      });
      expect(result).toEqual(mockCart);
    });

    it('should return null when not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByUserAndStore('u2', 's2');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'u2' }, store: { id: 's2' } },
        relations: ['store', 'items', 'items.variant'],
      });
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      const err = new Error('DB error');
      (repository.findOne as jest.Mock).mockRejectedValue(err);

      await expect(repository.findByUserAndStore('u1', 's1')).rejects.toThrow(
        err
      );
    });
  });

  describe('findAllByUser', () => {
    it('should find all carts by user with relations and order', async () => {
      (repository.find as jest.Mock).mockResolvedValue([mockCart]);

      const result = await repository.findAllByUser('user-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-1' } },
        relations: ['store', 'items', 'items.variant'],
        order: { updatedAt: 'DESC' },
      });
      expect(result).toEqual([mockCart]);
    });

    it('should return empty array when none exist', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findAllByUser('user-2');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      const err = new Error('DB error');
      (repository.find as jest.Mock).mockRejectedValue(err);

      await expect(repository.findAllByUser('u1')).rejects.toThrow(err);
    });
  });

  describe('findWithItems', () => {
    it('should find one cart with items, variant, stores, and user relations', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockCart);

      const result = await repository.findWithItems('c1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'c1' },
        relations: ['items', 'items.variant', 'store', 'user'],
      });
      expect(result).toEqual(mockCart);
    });

    it('should return null when not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findWithItems('c2');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      const err = new Error('DB error');
      (repository.findOne as jest.Mock).mockRejectedValue(err);

      await expect(repository.findWithItems('c1')).rejects.toThrow(err);
    });
  });

  describe('BaseRepository inheritance', () => {
    it('should have inherited methods', () => {
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });
  });
});
