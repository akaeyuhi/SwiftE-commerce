import { UserRepository } from 'src/modules/user/user.repository';
import { User } from 'src/entities/user/user.entity';
import { DataSource, EntityManager } from 'typeorm';
import {
  createMock,
  createMockEntityManager,
  MockedMethods,
} from 'test/unit/helpers';
import { Test, TestingModule } from '@nestjs/testing';

describe('UserRepository', () => {
  let repository: UserRepository;
  let dataSource: Partial<MockedMethods<DataSource>>;
  let entityManager: Partial<MockedMethods<EntityManager>>;

  const mockUser: User = {
    id: 'u1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as User;

  const mockUserWithPassword = {
    ...mockUser,
    password: 'hashed_password_123',
  };

  beforeEach(async () => {
    entityManager = createMockEntityManager('getRepository');
    dataSource = createMock<DataSource>(['createEntityManager']);
    dataSource.createEntityManager!.mockReturnValue(
      entityManager as unknown as EntityManager
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);

    // Mock inherited Repository methods
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findOneBy').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'save').mockImplementation(jest.fn());
    jest.spyOn(repository, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repository, 'update').mockImplementation(jest.fn());
    jest.spyOn(repository, 'createQueryBuilder').mockImplementation(jest.fn());

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should extend BaseRepository', () => {
      expect(repository).toBeInstanceOf(UserRepository);
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.createEntity).toBe('function');
      expect(typeof repository.updateEntity).toBe('function');
      expect(typeof repository.deleteById).toBe('function');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found by email', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });

    it('should handle various email formats', async () => {
      const emailFormats = [
        'simple@example.com',
        'user+tag@example.com',
        'user.name@example.com',
        'user123@example-domain.com',
        'user@subdomain.example.com',
      ];

      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      for (const email of emailFormats) {
        await repository.findByEmail(email);
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { email },
        });
      }

      expect(repository.findOne).toHaveBeenCalledTimes(emailFormats.length);
    });

    it('should handle case sensitivity', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      await repository.findByEmail('Test@Example.COM');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'Test@Example.COM' },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      (repository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow(
        dbError
      );
    });

    it('should handle empty and invalid emails', async () => {
      const invalidEmails = [
        '',
        '   ',
        'invalid-email',
        '@example.com',
        'user@',
      ];

      (repository.findOne as jest.Mock).mockResolvedValue(null);

      for (const email of invalidEmails) {
        const result = await repository.findByEmail(email);
        expect(result).toBeNull();
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { email },
        });
      }
    });
  });

  describe('getUserWithPassword', () => {
    it('should get user with password using query builder', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUserWithPassword),
      };

      (repository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder
      );

      const result = await repository.getUserWithPassword('test@example.com');

      expect(result).toEqual(mockUserWithPassword);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('user.id', 'id');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.id');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.username');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.email');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.role');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.email = :email',
        {
          email: 'test@example.com',
        }
      );
      expect(mockQueryBuilder.getOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      (repository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder
      );

      const result = await repository.getUserWithPassword(
        'nonexistent@example.com'
      );

      expect(result).toBeNull();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.email = :email',
        {
          email: 'nonexistent@example.com',
        }
      );
    });

    it('should handle query builder errors', async () => {
      const queryError = new Error('Query execution failed');
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(queryError),
      };

      (repository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder
      );

      await expect(
        repository.getUserWithPassword('test@example.com')
      ).rejects.toThrow(queryError);
    });

    it('properly chains query builder methods', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUserWithPassword),
      } as any;

      (repository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder
      );

      await repository.getUserWithPassword('test@example.com');

      const selectOrder = mockQueryBuilder.select.mock.invocationCallOrder[0];
      const addOrder = mockQueryBuilder.addSelect.mock.invocationCallOrder[0];
      const whereOrder = mockQueryBuilder.where.mock.invocationCallOrder[0];
      const getOneOrder = mockQueryBuilder.getOne.mock.invocationCallOrder[0];

      expect(selectOrder).toBeLessThan(addOrder);
      expect(addOrder).toBeLessThan(whereOrder);
      expect(whereOrder).toBeLessThan(getOneOrder);
    });
  });

  describe('removeRoleFromUser', () => {
    it('should build and execute delete query for user role', async () => {
      const mockDeleteResult = { affected: 1 };
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockDeleteResult),
      };

      const mockUserRoleRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };

      entityManager.getRepository!.mockReturnValue(mockUserRoleRepo as any);

      const result = await repository.removeRoleFromUser('u1', 'r1', 's1');

      expect(result).toEqual(mockDeleteResult);
      expect(entityManager.getRepository).toHaveBeenCalledWith('UserRole');
      expect(mockUserRoleRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.delete).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ur.userId = :userId',
        {
          userId: 'u1',
        }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ur.roleId = :roleId',
        { roleId: 'r1' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ur.storeId = :storeId',
        { storeId: 's1' }
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle case when no role is removed', async () => {
      const mockDeleteResult = { affected: 0 };
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockDeleteResult),
      };

      const mockUserRoleRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };

      entityManager.getRepository!.mockReturnValue(mockUserRoleRepo as any);

      const result = await repository.removeRoleFromUser(
        'u1',
        'nonexistent',
        's1'
      );

      expect(result).toEqual(mockDeleteResult);
      expect(result.affected).toBe(0);
    });

    it('should handle delete query errors', async () => {
      const deleteError = new Error('Delete operation failed');
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(deleteError),
      };

      const mockUserRoleRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };

      entityManager.getRepository!.mockReturnValue(mockUserRoleRepo as any);

      await expect(
        repository.removeRoleFromUser('u1', 'r1', 's1')
      ).rejects.toThrow(deleteError);
    });

    it('should handle different parameter combinations', async () => {
      const testCases = [
        ['user1', 'role1', 'store1'],
        ['user2', 'role2', 'store2'],
        ['user-with-dashes', 'role_with_underscores', 'stores.with.dots'],
      ];

      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      const mockUserRoleRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };

      entityManager.getRepository!.mockReturnValue(mockUserRoleRepo as any);

      for (const [userId, roleId, storeId] of testCases) {
        await repository.removeRoleFromUser(userId, roleId, storeId);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'ur.userId = :userId',
          { userId }
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ur.roleId = :roleId',
          { roleId }
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ur.storeId = :storeId',
          { storeId }
        );
      }
    });
  });

  describe('inherited BaseRepository methods', () => {
    it('should delegate to TypeORM Repository methods', async () => {
      (repository.find as jest.Mock).mockResolvedValue([mockUser]);
      (repository.findOneBy as jest.Mock).mockResolvedValue(mockUser);

      await repository.findAll();
      await repository.findById('u1');

      expect(repository.find).toHaveBeenCalledTimes(1);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent operations', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const concurrentCalls = Array.from({ length: 3 }, () =>
        repository.findByEmail('test@example.com')
      );

      const results = await Promise.all(concurrentCalls);

      expect(results).toHaveLength(3);
      expect(results.every((result) => result === mockUser)).toBe(true);
      expect(repository.findOne).toHaveBeenCalledTimes(3);
    });

    it('should handle repository connection issues', async () => {
      const connectionError = new Error('Database connection lost');
      (repository.findOne as jest.Mock).mockRejectedValue(connectionError);

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow(
        connectionError
      );
    });
  });
});
