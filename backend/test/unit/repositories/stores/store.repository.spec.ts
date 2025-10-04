import { StoreRepository } from 'src/modules/store/store.repository';
import { Store } from 'src/entities/store/store.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';
import { Test, TestingModule } from '@nestjs/testing';

describe('StoreRepository', () => {
  let repository: StoreRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    description: 'A test stores',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as Store;

  const mockStoreList: Store[] = [
    mockStore,
    {
      id: 's2',
      name: 'Another Store',
      description: 'Another test stores',
      isActive: true,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as unknown as Store,
  ];

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
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

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should extend BaseRepository', () => {
      expect(repository).toBeInstanceOf(StoreRepository);
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });
  });

  describe('findStoreByName', () => {
    it('should find stores by name', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);

      const result = await repository.findStoreByName('Test Store');

      expect(result).toEqual(mockStore);
      expect(repository.findOneBy).toHaveBeenCalledWith({ name: 'Test Store' });
      expect(repository.findOneBy).toHaveBeenCalledTimes(1);
    });

    it('should return null when stores not found by name', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await repository.findStoreByName('Nonexistent Store');

      expect(result).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({
        name: 'Nonexistent Store',
      });
    });

    it('should handle empty string name', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await repository.findStoreByName('');

      expect(result).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({ name: '' });
    });

    it('should handle whitespace-only names', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await repository.findStoreByName('   ');

      expect(result).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({ name: '   ' });
    });

    it('should handle case-sensitive names', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);

      await repository.findStoreByName('Test Store');
      await repository.findStoreByName('test store');
      await repository.findStoreByName('TEST STORE');

      expect(repository.findOneBy).toHaveBeenCalledTimes(3);
      expect(repository.findOneBy).toHaveBeenNthCalledWith(1, {
        name: 'Test Store',
      });
      expect(repository.findOneBy).toHaveBeenNthCalledWith(2, {
        name: 'test store',
      });
      expect(repository.findOneBy).toHaveBeenNthCalledWith(3, {
        name: 'TEST STORE',
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      (repository.findOneBy as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findStoreByName('Test Store')).rejects.toThrow(
        dbError
      );
    });

    it('should handle special characters in names', async () => {
      const specialNames = [
        'Store & Co.',
        'Store-123',
        'Store_test',
        'Store@domain.com',
        `Store's Place`,
      ];

      (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);

      for (const name of specialNames) {
        await repository.findStoreByName(name);
        expect(repository.findOneBy).toHaveBeenCalledWith({ name });
      }

      expect(repository.findOneBy).toHaveBeenCalledTimes(specialNames.length);
    });
  });

  describe('inherited BaseRepository methods', () => {
    describe('findAll', () => {
      it('should delegate to find() method', async () => {
        (repository.find as jest.Mock).mockResolvedValue(mockStoreList);

        const result = await repository.findAll();

        expect(result).toEqual(mockStoreList);
        expect(repository.find).toHaveBeenCalledTimes(1);
        expect(repository.find).toHaveBeenCalledWith();
      });

      it('should return empty array when no stores exist', async () => {
        (repository.find as jest.Mock).mockResolvedValue([]);

        const result = await repository.findAll();

        expect(result).toEqual([]);
        expect(repository.find).toHaveBeenCalledTimes(1);
      });

      it('should handle database errors', async () => {
        const dbError = new Error('Database query failed');
        (repository.find as jest.Mock).mockRejectedValue(dbError);

        await expect(repository.findAll()).rejects.toThrow(dbError);
      });
    });

    describe('findById', () => {
      it('should find stores by id', async () => {
        (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);

        const result = await repository.findById('s1');

        expect(result).toEqual(mockStore);
        expect(repository.findOneBy).toHaveBeenCalledWith({ id: 's1' });
      });

      it('should return null when stores not found', async () => {
        (repository.findOneBy as jest.Mock).mockResolvedValue(null);

        const result = await repository.findById('nonexistent');

        expect(result).toBeNull();
        expect(repository.findOneBy).toHaveBeenCalledWith({
          id: 'nonexistent',
        });
      });
    });

    describe('createEntity', () => {
      it('should create and save new stores', async () => {
        const createData = { name: 'New Store', description: 'A new stores' };
        const createdEntity = { id: 's3', ...createData } as Store;
        const savedEntity = {
          ...createdEntity,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Store;

        (repository.create as jest.Mock).mockReturnValue(createdEntity);
        (repository.save as jest.Mock).mockResolvedValue(savedEntity);

        const result = await repository.createEntity(createData);

        expect(result).toEqual(savedEntity);
        expect(repository.create).toHaveBeenCalledWith(createData);
        expect(repository.save).toHaveBeenCalledWith(createdEntity);
      });

      it('should handle creation errors', async () => {
        const createError = new Error('Name already exists');
        (repository.create as jest.Mock).mockReturnValue({});
        (repository.save as jest.Mock).mockRejectedValue(createError);

        await expect(repository.createEntity({})).rejects.toThrow(createError);
      });
    });

    describe('updateEntity', () => {
      it('should update existing stores', async () => {
        const updateData = { name: 'Updated Store' };

        (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);
        (repository.update as jest.Mock).mockResolvedValue({ affected: 1 });

        const result = await repository.updateEntity('s1', updateData);

        expect(result).toEqual(mockStore);
        expect(repository.findOneBy).toHaveBeenCalledWith({ id: 's1' });
        expect(repository.update).toHaveBeenCalledWith('s1', updateData);
      });

      it('should throw NotFoundException when stores not found', async () => {
        (repository.findOneBy as jest.Mock).mockResolvedValue(null);

        await expect(
          repository.updateEntity('nonexistent', {})
        ).rejects.toThrow('Entity with ID nonexistent not found');
        expect(repository.update).not.toHaveBeenCalled();
      });
    });

    describe('deleteById', () => {
      it('should delete stores by id', async () => {
        (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });

        await repository.deleteById('s1');

        expect(repository.delete).toHaveBeenCalledWith('s1');
        expect(repository.delete).toHaveBeenCalledTimes(1);
      });

      it('should not throw when deleting non-existent stores', async () => {
        (repository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

        await expect(
          repository.deleteById('nonexistent')
        ).resolves.not.toThrow();
        expect(repository.delete).toHaveBeenCalledWith('nonexistent');
      });
    });
  });

  describe('error handling', () => {
    it('should handle concurrent findStoreByName operations', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);

      const concurrentCalls = Array.from({ length: 3 }, () =>
        repository.findStoreByName('Test Store')
      );

      const results = await Promise.all(concurrentCalls);

      expect(results).toHaveLength(3);
      expect(results.every((result) => result === mockStore)).toBe(true);
      expect(repository.findOneBy).toHaveBeenCalledTimes(3);
    });

    it('should handle repository method failures', async () => {
      const repositoryError = new Error('Repository operation failed');
      (repository.findOneBy as jest.Mock).mockRejectedValue(repositoryError);

      await expect(repository.findStoreByName('Test Store')).rejects.toThrow(
        repositoryError
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long stores names', async () => {
      const longName = 'A'.repeat(1000);
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await repository.findStoreByName(longName);

      expect(result).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({ name: longName });
    });

    it('should handle unicode characters in stores names', async () => {
      const unicodeName = '店铺测试 🏪 مخزن';
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockStore);

      const result = await repository.findStoreByName(unicodeName);

      expect(result).toEqual(mockStore);
      expect(repository.findOneBy).toHaveBeenCalledWith({ name: unicodeName });
    });
  });
});
