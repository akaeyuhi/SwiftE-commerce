import { StoreRoleRepository } from 'src/modules/store/store-role/store-role.repository';
import { StoreRole } from 'src/entities/user/authentication/store-role.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateStoreRoleDto } from 'src/modules/store/store-role/dto/update-store-role.dto';

describe('StoreRoleRepository', () => {
  let repository: StoreRoleRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockStoreRole: StoreRole = {
    id: 'r1',
    roleName: 'STORE_ADMIN',
    user: { id: 'u1' },
    store: { id: 's1' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as StoreRole;

  const mockUserRoleList: StoreRole[] = [
    mockStoreRole,
    {
      id: 'r2',
      roleName: 'STORE_USER',
      user: { id: 'u2' },
      store: { id: 's1' },
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as unknown as StoreRole,
  ];

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreRoleRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<StoreRoleRepository>(StoreRoleRepository);

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
      expect(repository).toBeInstanceOf(StoreRoleRepository);
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });
  });

  describe('inherited BaseRepository methods', () => {
    describe('findAll', () => {
      it('should delegate to find() method', async () => {
        (repository.find as jest.Mock).mockResolvedValue(mockUserRoleList);

        const result = await repository.findAll();

        expect(result).toEqual(mockUserRoleList);
        expect(repository.find).toHaveBeenCalledTimes(1);
        expect(repository.find).toHaveBeenCalledWith();
      });

      it('should return empty array when no user roles exist', async () => {
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

      it('should handle large datasets', async () => {
        const largeRoleList = Array.from({ length: 1000 }, (_, i) => ({
          id: `role${i}`,
          roleName: 'STORE_USER',
          user: { id: `user${i}` },
          store: { id: 'store1' },
        })) as unknown as StoreRole[];

        (repository.find as jest.Mock).mockResolvedValue(largeRoleList);

        const result = await repository.findAll();

        expect(result).toHaveLength(1000);
        expect(repository.find).toHaveBeenCalledTimes(1);
      });
    });

    describe('findById', () => {
      it('should delegate to findOneBy() method', async () => {
        (repository.findOneBy as jest.Mock).mockResolvedValue(mockStoreRole);

        const result = await repository.findById('r1');

        expect(result).toEqual(mockStoreRole);
        expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'r1' });
        expect(repository.findOneBy).toHaveBeenCalledTimes(1);
      });

      it('should return null when user role not found', async () => {
        (repository.findOneBy as jest.Mock).mockResolvedValue(null);

        const result = await repository.findById('nonexistent');

        expect(result).toBeNull();
        expect(repository.findOneBy).toHaveBeenCalledWith({
          id: 'nonexistent',
        });
      });

      it('should handle various id formats', async () => {
        const testIds = [
          'r1',
          'role-123',
          'role_test',
          '12345',
          'uuid-format-id',
        ];

        (repository.findOneBy as jest.Mock).mockResolvedValue(mockStoreRole);

        for (const id of testIds) {
          const result = await repository.findById(id);

          expect(result).toEqual(mockStoreRole);
          expect(repository.findOneBy).toHaveBeenCalledWith({ id });
        }

        expect(repository.findOneBy).toHaveBeenCalledTimes(testIds.length);
      });

      it('should handle database errors', async () => {
        const dbError = new Error('Database connection failed');
        (repository.findOneBy as jest.Mock).mockRejectedValue(dbError);

        await expect(repository.findById('r1')).rejects.toThrow(dbError);
      });

      it('should handle empty and whitespace ids', async () => {
        const invalidIds = ['', '   ', '\t', '\n'];

        (repository.findOneBy as jest.Mock).mockResolvedValue(null);

        for (const id of invalidIds) {
          const result = await repository.findById(id);
          expect(result).toBeNull();
          expect(repository.findOneBy).toHaveBeenCalledWith({ id });
        }
      });
    });

    describe('createEntity', () => {
      it('should delegate to create and save methods', async () => {
        const createData = { roleName: 'STORE_MANAGER' } as any;
        const createdEntity = {
          roleName: 'STORE_MANAGER',
        } as unknown as StoreRole;
        const savedEntity = {
          id: 'r3',
          roleName: 'STORE_MANAGER',
        } as unknown as StoreRole;

        (repository.create as jest.Mock).mockReturnValue(createdEntity);
        (repository.save as jest.Mock).mockResolvedValue(savedEntity);

        const result = await repository.createEntity(createData);

        expect(result).toEqual(savedEntity);
        expect(repository.create).toHaveBeenCalledWith(createData);
        expect(repository.save).toHaveBeenCalledWith(createdEntity);
        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.save).toHaveBeenCalledTimes(1);
      });

      it('should handle creation with full role data', async () => {
        const fullCreateData = {
          roleName: 'STORE_ADMIN',
          user: { id: 'u1' },
          store: { id: 's1' },
          permissions: ['READ', 'WRITE'],
        } as any;

        const createdEntity = { ...fullCreateData } as StoreRole;
        const savedEntity = { id: 'r4', ...fullCreateData } as StoreRole;

        (repository.create as jest.Mock).mockReturnValue(createdEntity);
        (repository.save as jest.Mock).mockResolvedValue(savedEntity);

        const result = await repository.createEntity(fullCreateData);

        expect(result).toEqual(savedEntity);
        expect(repository.create).toHaveBeenCalledWith(fullCreateData);
        expect(repository.save).toHaveBeenCalledWith(createdEntity);
      });

      it('should handle creation errors', async () => {
        const createError = new Error(
          'Role name already exists for this user/stores combination'
        );
        (repository.create as jest.Mock).mockReturnValue({});
        (repository.save as jest.Mock).mockRejectedValue(createError);

        await expect(repository.createEntity({})).rejects.toThrow(createError);
        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.save).toHaveBeenCalledTimes(1);
      });

      it('should handle constraint violations', async () => {
        const constraintError = new Error('Foreign key constraint violation');
        (repository.create as jest.Mock).mockReturnValue({});
        (repository.save as jest.Mock).mockRejectedValue(constraintError);

        await expect(
          repository.createEntity({
            roleName: 'INVALID_ROLE',
          } as unknown as StoreRole)
        ).rejects.toThrow(constraintError);
      });

      it('should handle empty create data', async () => {
        const emptyData = {} as any;
        const createdEntity = {} as StoreRole;
        const savedEntity = { id: 'r5' } as StoreRole;

        (repository.create as jest.Mock).mockReturnValue(createdEntity);
        (repository.save as jest.Mock).mockResolvedValue(savedEntity);

        const result = await repository.createEntity(emptyData);

        expect(result).toEqual(savedEntity);
        expect(repository.create).toHaveBeenCalledWith(emptyData);
        expect(repository.save).toHaveBeenCalledWith(createdEntity);
      });

      it('should maintain referential integrity', async () => {
        const roleData = {
          roleName: 'STORE_ADMIN',
          user: { id: 'u1' },
          store: { id: 's1' },
        } as any;

        const createdEntity = { ...roleData } as StoreRole;
        const savedEntity = { id: 'r6', ...roleData } as StoreRole;

        (repository.create as jest.Mock).mockReturnValue(createdEntity);
        (repository.save as jest.Mock).mockResolvedValue(savedEntity);

        const result = await repository.createEntity(roleData);

        expect(result.user).toBeDefined();
        expect(result.store).toBeDefined();
        expect(result.user.id).toBe('u1');
        expect(result.store.id).toBe('s1');
      });
    });

    describe('updateEntity', () => {
      it('should update existing user role', async () => {
        const updateData = {
          roleName: 'STORE_MANAGER',
        } as unknown as UpdateStoreRoleDto;

        (repository.findOneBy as jest.Mock).mockResolvedValue(mockStoreRole);
        (repository.update as jest.Mock).mockResolvedValue({ affected: 1 });

        const result = await repository.updateEntity('r1', updateData);

        expect(result).toEqual(mockStoreRole);
        expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'r1' });
        expect(repository.update).toHaveBeenCalledWith('r1', updateData);
      });

      it('should throw NotFoundException when user role not found', async () => {
        (repository.findOneBy as jest.Mock).mockResolvedValue(null);

        await expect(
          repository.updateEntity('nonexistent', {})
        ).rejects.toThrow('Entity with ID nonexistent not found');
        expect(repository.update).not.toHaveBeenCalled();
      });
    });

    describe('deleteById', () => {
      it('should delete user role by id', async () => {
        (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });

        await repository.deleteById('r1');

        expect(repository.delete).toHaveBeenCalledWith('r1');
        expect(repository.delete).toHaveBeenCalledTimes(1);
      });

      it('should not throw when deleting non-existent user role', async () => {
        (repository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

        await expect(
          repository.deleteById('nonexistent')
        ).resolves.not.toThrow();
        expect(repository.delete).toHaveBeenCalledWith('nonexistent');
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockUserRoleList);

      const concurrentCalls = Array.from({ length: 5 }, () =>
        repository.findAll()
      );

      const results = await Promise.all(concurrentCalls);

      expect(results).toHaveLength(5);
      expect(results.every((result) => result === mockUserRoleList)).toBe(true);
      expect(repository.find).toHaveBeenCalledTimes(5);
    });

    it('should handle repository connection issues', async () => {
      const connectionError = new Error('Database connection lost');
      (repository.find as jest.Mock).mockRejectedValue(connectionError);

      await expect(repository.findAll()).rejects.toThrow(connectionError);
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = { invalidField: 'value' } as any;
      (repository.create as jest.Mock).mockReturnValue(malformedData);
      (repository.save as jest.Mock).mockResolvedValue({
        id: 'r7',
        ...malformedData,
      });

      const result = await repository.createEntity(malformedData);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(malformedData);
    });
  });

  describe('performance considerations', () => {
    it('should efficiently handle batch operations', async () => {
      const batchData = Array.from({ length: 100 }, (_, i) => ({
        roleName: `ROLE_${i}`,
        user: { id: `user${i}` },
        store: { id: 'store1' },
      }));

      (repository.create as jest.Mock).mockImplementation((data) => data);
      (repository.save as jest.Mock).mockImplementation((data) => ({
        id: `r${Math.random()}`,
        ...data,
      }));

      const promises = batchData.map((data) =>
        repository.createEntity(data as any)
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(repository.create).toHaveBeenCalledTimes(100);
      expect(repository.save).toHaveBeenCalledTimes(100);
    });
  });
});
