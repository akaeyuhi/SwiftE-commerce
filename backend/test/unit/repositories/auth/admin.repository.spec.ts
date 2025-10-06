import { AdminRepository } from 'src/modules/admin/admin.repository';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createMock, MockedMethods } from 'test/utils/helpers';
import { NotFoundException } from '@nestjs/common';
import { UpdateAdminDto } from 'src/modules/admin/dto/update-admin.dto';
import { Test, TestingModule } from '@nestjs/testing';

describe('AdminRepository', () => {
  let repository: AdminRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  // Mock data
  const mockAdmin: Admin = {
    id: 'admin1',
    user: { id: 'user1', email: 'admin@example.com' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as Admin;

  const mockAdminList: Admin[] = [
    mockAdmin,
    {
      id: 'admin2',
      user: { id: 'user2', email: 'admin2@example.com' },
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    } as unknown as Admin,
  ];

  beforeEach(async () => {
    entityManager = createMock<EntityManager>([]);
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<AdminRepository>(AdminRepository);

    // Mock the inherited Repository methods
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOneBy').mockImplementation(jest.fn());
    jest.spyOn(repository, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'save').mockImplementation(jest.fn());
    jest.spyOn(repository, 'update').mockImplementation(jest.fn());

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should extend BaseRepository', () => {
      expect(repository).toBeInstanceOf(AdminRepository);
      // Verify it has inherited methods from BaseRepository
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });
  });

  describe('findAll', () => {
    it('should return all admins', async () => {
      (repository.find as jest.Mock).mockResolvedValue(mockAdminList);

      const result = await repository.findAll();

      expect(result).toEqual(mockAdminList);
      expect(repository.find).toHaveBeenCalledTimes(1);
      expect(repository.find).toHaveBeenCalledWith();
    });

    it('should return empty array when no admins exist', async () => {
      (repository.find as jest.Mock).mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      (repository.find as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findAll()).rejects.toThrow(dbError);
    });
  });

  describe('findById', () => {
    it('should return admin by id', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await repository.findById('admin1');

      expect(result).toEqual(mockAdmin);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'admin1' });
      expect(repository.findOneBy).toHaveBeenCalledTimes(1);
    });

    it('should return null when admin not found', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query execution failed');
      (repository.findOneBy as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findById('admin1')).rejects.toThrow(dbError);
    });
  });

  describe('createEntity', () => {
    it('should create and save a new admin', async () => {
      const createData = { user: { id: 'user3' } };
      const createdEntity = { id: 'admin3', ...createData } as Admin;
      const savedEntity = {
        ...createdEntity,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Admin;

      (repository.create as jest.Mock).mockReturnValue(createdEntity);
      (repository.save as jest.Mock).mockResolvedValue(savedEntity);

      const result = await repository.createEntity(createData);

      expect(result).toEqual(savedEntity);
      expect(repository.create).toHaveBeenCalledWith(createData);
      expect(repository.save).toHaveBeenCalledWith(createdEntity);
    });

    it('should handle creation errors', async () => {
      const createError = new Error('Unique constraint violation');
      (repository.create as jest.Mock).mockReturnValue({});
      (repository.save as jest.Mock).mockRejectedValue(createError);

      await expect(repository.createEntity({})).rejects.toThrow(createError);
    });
  });

  describe('updateEntity', () => {
    it('should update existing admin', async () => {
      const updateData = { user: { id: 'updated-user' } } as UpdateAdminDto;

      (repository.findOneBy as jest.Mock).mockResolvedValue(mockAdmin);
      (repository.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await repository.updateEntity('admin1', updateData);

      expect(result).toEqual(mockAdmin);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'admin1' });
      expect(repository.update).toHaveBeenCalledWith('admin1', updateData);
    });

    it('should throw NotFoundException when admin not found', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      await expect(repository.updateEntity('nonexistent', {})).rejects.toThrow(
        NotFoundException
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockAdmin);
      const updateError = new Error('Update constraint violation');
      (repository.update as jest.Mock).mockRejectedValue(updateError);

      await expect(repository.updateEntity('admin1', {})).rejects.toThrow(
        updateError
      );
    });
  });

  describe('deleteById', () => {
    it('should delete admin by id', async () => {
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      await repository.deleteById('admin1');

      expect(repository.delete).toHaveBeenCalledWith('admin1');
      expect(repository.delete).toHaveBeenCalledTimes(1);
    });

    it('should not throw when deleting non-existent admin', async () => {
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

      await expect(repository.deleteById('nonexistent')).resolves.not.toThrow();
      expect(repository.delete).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle deletion errors', async () => {
      const deleteError = new Error('Foreign key constraint violation');
      (repository.delete as jest.Mock).mockRejectedValue(deleteError);

      await expect(repository.deleteById('admin1')).rejects.toThrow(
        deleteError
      );
    });
  });

  describe('TypeORM integration', () => {
    it('should properly initialize with DataSource', () => {
      const newDataSource = createMock<DataSource>(['createEntityManager']);
      const newEntityManager = createMock<EntityManager>([]);
      newDataSource.createEntityManager!.mockReturnValue(
        newEntityManager as unknown as EntityManager
      );

      const newRepository = new AdminRepository(
        newDataSource as unknown as DataSource
      );

      expect(newRepository).toBeDefined();
      expect(newDataSource.createEntityManager).toHaveBeenCalledTimes(1);
    });
  });

  describe('BaseRepository inheritance', () => {
    it('should have all BaseRepository methods available', () => {
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });

    it('should properly delegate to TypeORM Repository methods', async () => {
      // Test that BaseRepository methods call the underlying TypeORM methods
      (repository.find as jest.Mock).mockResolvedValue([]);
      (repository.findOneBy as jest.Mock).mockResolvedValue(null);

      await repository.findAll();
      await repository.findById('test');

      expect(repository.find).toHaveBeenCalled();
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'test' });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations', async () => {
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockAdmin);

      const promises = [
        repository.findById('admin1'),
        repository.findById('admin1'),
        repository.findById('admin1'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([mockAdmin, mockAdmin, mockAdmin]);
      expect(repository.findOneBy).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = null;
      (repository.create as jest.Mock).mockReturnValue({});
      (repository.save as jest.Mock).mockResolvedValue({});

      await expect(
        repository.createEntity(malformedData as any)
      ).resolves.toBeDefined();
    });
  });
});
