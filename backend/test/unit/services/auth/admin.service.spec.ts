import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from 'src/modules/admin/admin.service';
import { AdminRepository } from 'src/modules/admin/admin.repository';
import { UserService } from 'src/modules/user/user.service';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { User } from 'src/entities/user/user.entity';
import {
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from 'test/unit/helpers';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAdminDto } from 'src/modules/admin/dto/create-admin.dto';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepo: Partial<MockedMethods<AdminRepository>>;
  let userService: Partial<MockedMethods<UserService>>;

  const mockUser: User = {
    id: 'user1',
    email: 'admin@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as User;

  const mockAdmin: Admin = {
    id: 'admin1',
    user: mockUser,
    userId: 'user1',
    assignedBy: 'super-admin',
    assignedAt: new Date('2024-01-01'),
    revokedBy: undefined,
    revokedAt: undefined,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    metadata: {},
  } as Admin;

  const mockInactiveAdmin: Admin = {
    id: 'admin2',
    user: { ...mockUser, id: 'user2', email: 'inactive@example.com' } as User,
    userId: 'user2',
    assignedBy: 'super-admin',
    assignedAt: new Date('2024-01-01'),
    revokedBy: 'super-admin',
    revokedAt: new Date('2024-02-01'),
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-01'),
    metadata: {},
  } as Admin;

  const mockAdminList: Admin[] = [mockAdmin, mockInactiveAdmin];

  beforeEach(async () => {
    adminRepo = createRepositoryMock<AdminRepository>([
      'findOne',
      'find',
      'findAll',
      'findById',
      'createEntity',
      'updateEntity',
      'delete',
      'save',
      'create',
      'update',
    ]);

    userService = createServiceMock<UserService>([
      'getEntityById',
      'findByEmail',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: adminRepo },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(AdminService);
      expect(typeof service.create).toBe('function');
      expect(typeof service.findAll).toBe('function');
      expect(typeof service.findOne).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.remove).toBe('function');
    });
  });

  describe('findByUserId', () => {
    it('should return admin when found by userId', async () => {
      adminRepo.findOne!.mockResolvedValue(mockAdmin);

      const result = await service.findByUserId('user1');

      expect(result).toEqual(mockAdmin);
      expect(adminRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'user1' } },
        relations: ['user'],
      });
      expect(adminRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when admin not found by userId', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByUserId('nonexistent-user');

      expect(result).toBeNull();
      expect(adminRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'nonexistent-user' } },
        relations: ['user'],
      });
    });

    it('should handle repository errors', async () => {
      const repositoryError = new Error('Database connection failed');
      adminRepo.findOne!.mockRejectedValue(repositoryError);

      await expect(service.findByUserId('user1')).rejects.toThrow(
        repositoryError
      );
    });
  });

  describe('isUserValidAdmin', () => {
    it('should return true when user is an active admin', async () => {
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockAdmin);

      const result = await service.isUserValidAdmin('user1');

      expect(result).toBe(true);
      expect(service.findByUserId).toHaveBeenCalledWith('user1');
    });

    it('should return false when user is not an admin', async () => {
      jest.spyOn(service, 'findByUserId').mockResolvedValue(null);

      const result = await service.isUserValidAdmin('user1');

      expect(result).toBe(false);
      expect(service.findByUserId).toHaveBeenCalledWith('user1');
    });

    it('should return false when user is an inactive admin', async () => {
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockInactiveAdmin);

      const result = await service.isUserValidAdmin('user2');

      expect(result).toBe(false);
      expect(service.findByUserId).toHaveBeenCalledWith('user2');
    });

    it('should return false when admin exists but isActive is false', async () => {
      const inactiveAdmin = { ...mockAdmin, isActive: false };
      jest.spyOn(service, 'findByUserId').mockResolvedValue(inactiveAdmin);

      const result = await service.isUserValidAdmin('user1');

      expect(result).toBe(false);
    });
  });

  describe('getFormattedActiveAdmins', () => {
    it('should return formatted active admins', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.getFormattedActiveAdmins('requester-id');

      expect(result.admins).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.retrievedBy).toBe('requester-id');
      expect(result.retrievedAt).toBeDefined();
      expect(result.admins[0]).toMatchObject({
        id: mockAdmin.id,
        userId: mockAdmin.user.id,
        user: {
          id: mockAdmin.user.id,
          email: mockAdmin.user.email,
        },
        isActive: true,
      });
    });

    it('should return empty array when no active admins', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([]);

      const result = await service.getFormattedActiveAdmins();

      expect(result.admins).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getActiveAdmins', () => {
    it('should return only active admins', async () => {
      adminRepo.find!.mockResolvedValue([mockAdmin]);

      const result = await service.getActiveAdmins();

      expect(result).toEqual([mockAdmin]);
      expect(adminRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no active admins', async () => {
      adminRepo.find!.mockResolvedValue([]);

      const result = await service.getActiveAdmins();

      expect(result).toEqual([]);
    });
  });

  describe('getFormattedAdminHistory', () => {
    it('should return formatted admin history for user', async () => {
      jest
        .spyOn(service, 'getAdminHistory')
        .mockResolvedValue([mockAdmin, mockInactiveAdmin]);

      const result = await service.getFormattedAdminHistory(
        'user1',
        'requester-id'
      );

      expect(result.userId).toBe('user1');
      expect(result.history).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.retrievedBy).toBe('requester-id');
      expect(result.retrievedAt).toBeDefined();
    });

    it('should return empty history when user has no admin records', async () => {
      jest.spyOn(service, 'getAdminHistory').mockResolvedValue([]);

      const result = await service.getFormattedAdminHistory('user1');

      expect(result.history).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getAdminHistory', () => {
    it('should return all admin records for user', async () => {
      adminRepo.find!.mockResolvedValue([mockAdmin, mockInactiveAdmin]);

      const result = await service.getAdminHistory('user1');

      expect(result).toHaveLength(2);
      expect(adminRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 'user1' } },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getMyAdminHistory', () => {
    it('should return limited admin history for current user', async () => {
      jest.spyOn(service, 'getAdminHistory').mockResolvedValue([mockAdmin]);

      const result = await service.getMyAdminHistory('user1');

      expect(result.history).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.retrievedAt).toBeDefined();
      expect(result.history[0]).not.toHaveProperty('user');
      expect(result.history[0]).toMatchObject({
        id: mockAdmin.id,
        assignedBy: mockAdmin.assignedBy,
        isActive: mockAdmin.isActive,
      });
    });
  });

  describe('assignSiteAdminRole', () => {
    it('should assign admin role to user', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      jest.spyOn(service, 'findByUserId').mockResolvedValue(null);
      jest.spyOn(service, 'create').mockResolvedValue(mockAdmin);

      const result = await service.assignSiteAdminRole('user1', 'super-admin');

      expect(result).toEqual(mockAdmin);
      expect(userService.getEntityById).toHaveBeenCalledWith('user1');
      expect(service.findByUserId).toHaveBeenCalledWith('user1');
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          assignedByUser: 'super-admin',
          isActive: true,
        })
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.getEntityById!.mockResolvedValue(null);

      await expect(
        service.assignSiteAdminRole('nonexistent', 'super-admin')
      ).rejects.toThrow(NotFoundException);

      expect(userService.getEntityById).toHaveBeenCalledWith('nonexistent');
    });

    it('should throw ConflictException when user is already active admin', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockAdmin);

      await expect(
        service.assignSiteAdminRole('user1', 'super-admin')
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate inactive admin', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockInactiveAdmin);
      jest.spyOn(service, 'update').mockResolvedValue({
        ...mockInactiveAdmin,
        isActive: true,
      });

      const result = await service.assignSiteAdminRole('user2', 'super-admin');

      expect(service.update).toHaveBeenCalledWith(
        mockInactiveAdmin.id,
        expect.objectContaining({
          isActive: true,
          assignedByUser: 'super-admin',
        })
      );
      expect(result.isActive).toBe(true);
    });
  });

  describe('processAdminAssignment', () => {
    it('should process admin assignment with formatted response', async () => {
      jest.spyOn(service, 'assignSiteAdminRole').mockResolvedValue(mockAdmin);

      const result = await service.processAdminAssignment(
        'user1',
        'super-admin'
      );

      expect(result).toMatchObject({
        admin: {
          id: mockAdmin.id,
          userId: mockAdmin.user.id,
          isActive: true,
        },
        message: 'Admin role assigned successfully',
        assignedBy: 'super-admin',
      });
      expect(result.assignedAt).toBeDefined();
    });
  });

  describe('revokeSiteAdminRole', () => {
    it('should revoke admin role from user', async () => {
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockAdmin);
      jest
        .spyOn(service, 'update')
        .mockResolvedValue({ ...mockAdmin, isActive: false });

      await service.revokeSiteAdminRole('user1', 'super-admin');

      expect(service.update).toHaveBeenCalledWith(
        mockAdmin.id,
        expect.objectContaining({
          isActive: false,
          revokedBy: 'super-admin',
        })
      );
    });

    it('should throw NotFoundException when user is not an admin', async () => {
      jest.spyOn(service, 'findByUserId').mockResolvedValue(null);

      await expect(
        service.revokeSiteAdminRole('user1', 'super-admin')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when admin role already inactive', async () => {
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockInactiveAdmin);

      await expect(
        service.revokeSiteAdminRole('user2', 'super-admin')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('processAdminRevocation', () => {
    it('should process admin revocation with formatted response', async () => {
      jest.spyOn(service, 'revokeSiteAdminRole').mockResolvedValue(undefined);

      const result = await service.processAdminRevocation(
        'user1',
        'super-admin'
      );

      expect(result).toMatchObject({
        message: 'Admin role revoked successfully',
        userId: 'user1',
        revokedBy: 'super-admin',
      });
      expect(result.revokedAt).toBeDefined();
    });
  });

  describe('checkAdminStatus', () => {
    it('should check admin status for active admin', async () => {
      jest.spyOn(service, 'isUserValidAdmin').mockResolvedValue(true);
      jest.spyOn(service, 'findByUserId').mockResolvedValue(mockAdmin);

      const result = await service.checkAdminStatus('user1', 'checker-id');

      expect(result).toMatchObject({
        userId: 'user1',
        isAdmin: true,
        checkedBy: 'checker-id',
      });
      expect(result.adminInfo).toMatchObject({
        id: mockAdmin.id,
        isActive: true,
      });
      expect(result.checkedAt).toBeDefined();
    });

    it('should check admin status for non-admin user', async () => {
      jest.spyOn(service, 'isUserValidAdmin').mockResolvedValue(false);
      jest.spyOn(service, 'findByUserId').mockResolvedValue(null);

      const result = await service.checkAdminStatus('user1');

      expect(result).toMatchObject({
        userId: 'user1',
        isAdmin: false,
        adminInfo: null,
      });
    });
  });

  describe('getAdminStats', () => {
    it('should return comprehensive admin statistics', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);
      jest.spyOn(service, 'findAll').mockResolvedValue(mockAdminList);

      const result = await service.getAdminStats('generator-id');

      expect(result.stats).toMatchObject({
        total: 2,
        active: 1,
        inactive: 1,
      });
      expect(result.stats.recentAssignments).toBeDefined();
      expect(result.stats.trends.assignmentsByMonth).toBeDefined();
      expect(result.generatedBy).toBe('generator-id');
      expect(result.generatedAt).toBeDefined();
    });

    it('should calculate recent assignments correctly', async () => {
      const recentAdmin = {
        ...mockAdmin,
        id: 'recent-admin',
        assignedAt: new Date(),
      };

      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([recentAdmin]);
      jest.spyOn(service, 'findAll').mockResolvedValue([recentAdmin]);

      const result = await service.getAdminStats();

      expect(result.stats.recentAssignments).toBeGreaterThan(0);
    });

    it('should group assignments by month', async () => {
      const admins = [
        { ...mockAdmin, assignedAt: new Date('2024-01-15') },
        { ...mockInactiveAdmin, assignedAt: new Date('2024-01-20') },
        {
          ...mockAdmin,
          id: 'admin3',
          assignedAt: new Date('2024-02-10'),
        } as Admin,
      ];

      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([]);
      jest.spyOn(service, 'findAll').mockResolvedValue(admins);

      const result = await service.getAdminStats();

      expect(result.stats.trends.assignmentsByMonth['2024-01']).toBe(2);
      expect(result.stats.trends.assignmentsByMonth['2024-02']).toBe(1);
    });
  });

  describe('searchAdmins', () => {
    it('should search admins by email', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.searchAdmins(
        'admin@example',
        true,
        'searcher-id'
      );

      expect(result.results).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.searchQuery).toBe('admin@example');
      expect(result.searchedBy).toBe('searcher-id');
      expect(result.searchedAt).toBeDefined();
    });

    it('should search admins by first name', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.searchAdmins('John');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].user.firstName).toBe('John');
    });

    it('should search admins by last name', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.searchAdmins('Doe');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].user.lastName).toBe('Doe');
    });

    it('should search admins by full name', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.searchAdmins('john doe');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].user.fullName).toBe('John Doe');
    });

    it('should search in both active and inactive admins when activeOnly is false', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockAdminList);

      const result = await service.searchAdmins('example', false);

      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should throw BadRequestException for short queries', async () => {
      await expect(service.searchAdmins('a')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for empty queries', async () => {
      await expect(service.searchAdmins('')).rejects.toThrow(
        BadRequestException
      );

      await expect(service.searchAdmins('   ')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should perform case-insensitive search', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.searchAdmins('ADMIN@EXAMPLE');

      expect(result.results).toHaveLength(1);
    });

    it('should return empty results when no match found', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const result = await service.searchAdmins('nomatch');

      expect(result.results).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('inherited BaseService methods', () => {
    describe('create', () => {
      it('should create a new admin', async () => {
        const createDto: CreateAdminDto = {
          userId: 'user3',
          assignedByUser: 'super-admin',
          isActive: true,
        };
        const createdAdmin = {
          id: 'admin3',
          ...createDto,
          user: mockUser,
        } as unknown as Admin;

        adminRepo.createEntity!.mockResolvedValue(createdAdmin);

        const result = await service.create(createDto);

        expect(result).toEqual(createdAdmin);
        expect(adminRepo.createEntity).toHaveBeenCalledWith(createDto);
      });
    });

    describe('findAll', () => {
      it('should return all admins', async () => {
        adminRepo.findAll!.mockResolvedValue(mockAdminList);

        const result = await service.findAll();

        expect(result).toEqual(mockAdminList);
        expect(adminRepo.findAll).toHaveBeenCalledTimes(1);
      });
    });

    describe('findOne', () => {
      it('should return admin by id', async () => {
        adminRepo.findById!.mockResolvedValue(mockAdmin);

        const result = await service.findOne('admin1');

        expect(result).toEqual(mockAdmin);
        expect(adminRepo.findById).toHaveBeenCalledWith('admin1');
      });

      it('should throw NotFoundException when admin not found', async () => {
        adminRepo.findById!.mockResolvedValue(null);

        await expect(service.findOne('nonexistent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('update', () => {
      it('should update existing admin', async () => {
        const updateDto = { isActive: false };
        const updatedAdmin = { ...mockAdmin, ...updateDto };

        adminRepo.findById!.mockResolvedValue(mockAdmin);
        adminRepo.save!.mockResolvedValue(updatedAdmin);

        const result = await service.update('admin1', updateDto);

        expect(result).toEqual(updatedAdmin);
        expect(adminRepo.findById).toHaveBeenCalledWith('admin1');
      });

      it('should throw NotFoundException when admin not found', async () => {
        adminRepo.findById!.mockResolvedValue(null);

        await expect(service.update('nonexistent', {})).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('remove', () => {
      it('should remove admin successfully', async () => {
        adminRepo.delete!.mockResolvedValue({ affected: 1, raw: {} } as any);

        await service.remove('admin1');

        expect(adminRepo.delete).toHaveBeenCalledWith('admin1');
      });

      it('should throw NotFoundException when admin not found', async () => {
        adminRepo.delete!.mockResolvedValue({ affected: 0, raw: {} } as any);

        await expect(service.remove('nonexistent')).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  describe('integration scenarios', () => {
    it('should assign and then revoke admin role', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      jest.spyOn(service, 'findByUserId').mockResolvedValueOnce(null);

      // Mock the repository method instead of the service method
      const createdAdmin = { ...mockAdmin, isActive: true };
      adminRepo.createEntity!.mockResolvedValue(createdAdmin);

      // Assign role
      const assigned = await service.assignSiteAdminRole(
        'user1',
        'super-admin'
      );
      expect(assigned.isActive).toBe(true);

      // Revoke role - set up new mocks for revocation
      jest.spyOn(service, 'findByUserId').mockResolvedValueOnce(createdAdmin);
      adminRepo.findById!.mockResolvedValue(createdAdmin);
      adminRepo.save!.mockResolvedValue({ ...createdAdmin, isActive: false });

      await service.revokeSiteAdminRole('user1', 'super-admin');

      expect(adminRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should check admin status after assignment', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      jest.spyOn(service, 'findByUserId').mockResolvedValueOnce(null);

      const activeAdmin = { ...mockAdmin, isActive: true };
      adminRepo.createEntity!.mockResolvedValue(activeAdmin);

      await service.assignSiteAdminRole('user1', 'super-admin');

      jest.spyOn(service, 'isUserValidAdmin').mockResolvedValue(true);
      jest.spyOn(service, 'findByUserId').mockResolvedValue(activeAdmin);

      const status = await service.checkAdminStatus('user1');
      expect(status.isAdmin).toBe(true);
      expect(status.adminInfo?.isActive).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent searches', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([mockAdmin]);

      const promises = [
        service.searchAdmins('john'),
        service.searchAdmins('doe'),
        service.searchAdmins('admin'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(service.getActiveAdmins).toHaveBeenCalledTimes(3);
    });

    it('should handle admin with partial user data', async () => {
      const partialAdmin = {
        ...mockAdmin,
        user: { id: 'user1', email: 'test@example.com' } as User,
      };

      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([partialAdmin]);

      const result = await service.getFormattedActiveAdmins();

      expect(result.admins[0].user).toBeDefined();
      expect(result.admins[0].user.email).toBe('test@example.com');
    });

    it('should handle stats with no admins', async () => {
      jest.spyOn(service, 'getActiveAdmins').mockResolvedValue([]);
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await service.getAdminStats();

      expect(result.stats.total).toBe(0);
      expect(result.stats.active).toBe(0);
      expect(result.stats.recentAssignments).toBe(0);
    });
  });
});
