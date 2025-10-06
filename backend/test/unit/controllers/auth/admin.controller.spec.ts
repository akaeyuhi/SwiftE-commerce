import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from 'src/modules/admin/admin.controller';
import { AdminService } from 'src/modules/admin/admin.service';
import { Admin } from 'src/entities/user/authentication/admin.entity';
import { CreateAdminDto } from 'src/modules/admin/dto/create-admin.dto';
import { UpdateAdminDto } from 'src/modules/admin/dto/update-admin.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from 'test/utils/helpers';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { Request } from 'express';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: Partial<MockedMethods<AdminService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  // Mock request with authenticated user
  const createMockRequest = (
    userId: string = 'requester-id'
  ): Partial<Request> => ({
    user: { id: userId } as any,
  });

  // Mock data
  const mockAdmin: Admin = {
    id: 'admin1',
    user: {
      id: 'user1',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isEmailVerified: true,
    },
    userId: 'user1',
    assignedBy: 'super-admin',
    assignedAt: new Date('2024-01-01'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as Admin;

  const mockFormattedAdmin = {
    id: 'admin1',
    userId: 'user1',
    user: {
      id: 'user1',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isEmailVerified: true,
    },
    assignedBy: 'super-admin',
    assignedAt: new Date('2024-01-01'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
  };

  const mockActiveAdminsResponse = {
    admins: [mockFormattedAdmin],
    count: 1,
    retrievedAt: '2024-01-15T10:00:00.000Z',
    retrievedBy: 'requester-id',
  };

  const mockAdminHistoryResponse = {
    userId: 'user1',
    history: [mockFormattedAdmin],
    count: 1,
    retrievedAt: '2024-01-15T10:00:00.000Z',
    retrievedBy: 'requester-id',
  };

  const mockMyHistoryResponse = {
    history: [
      {
        id: 'admin1',
        assignedBy: 'super-admin',
        assignedAt: new Date('2024-01-01'),
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
    ],
    count: 1,
    retrievedAt: '2024-01-15T10:00:00.000Z',
  };

  const mockAssignmentResponse = {
    admin: {
      id: 'admin1',
      userId: 'user1',
      assignedBy: 'requester-id',
      isActive: true,
    },
    message: 'Admin role assigned successfully',
    assignedAt: '2024-01-15T10:00:00.000Z',
    assignedBy: 'requester-id',
  };

  const mockRevocationResponse = {
    message: 'Admin role revoked successfully',
    userId: 'user1',
    revokedBy: 'requester-id',
    revokedAt: '2024-01-15T10:00:00.000Z',
  };

  const mockStatusResponse = {
    userId: 'user1',
    isAdmin: true,
    adminInfo: {
      id: 'admin1',
      assignedBy: 'super-admin',
      assignedAt: new Date('2024-01-01'),
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
    checkedAt: '2024-01-15T10:00:00.000Z',
    checkedBy: 'requester-id',
  };

  const mockStatsResponse = {
    stats: {
      total: 5,
      active: 4,
      inactive: 1,
      recentAssignments: 2,
      trends: {
        assignmentsByMonth: {
          '2024-01': 3,
          '2024-02': 2,
        },
      },
    },
    generatedAt: '2024-01-15T10:00:00.000Z',
    generatedBy: 'requester-id',
  };

  const mockSearchResponse = {
    searchQuery: 'john',
    results: [mockFormattedAdmin],
    count: 1,
    searchedAt: '2024-01-15T10:00:00.000Z',
    searchedBy: 'requester-id',
  };

  beforeEach(async () => {
    adminService = createServiceMock<AdminService>([
      'findAll',
      'findOne',
      'create',
      'update',
      'remove',
      'findByUserId',
      'isUserValidAdmin',
      'getFormattedActiveAdmins',
      'getActiveAdmins',
      'getFormattedAdminHistory',
      'getAdminHistory',
      'getMyAdminHistory',
      'assignSiteAdminRole',
      'processAdminAssignment',
      'revokeSiteAdminRole',
      'processAdminRevocation',
      'checkAdminStatus',
      'getAdminStats',
      'searchAdmins',
    ]);

    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: PolicyService, useValue: policyMock },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
      ],
    }).compile();

    controller = module.get(AdminController);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should extend BaseController', () => {
      expect(controller).toBeInstanceOf(AdminController);
      expect(typeof controller.findAll).toBe('function');
      expect(typeof controller.findOne).toBe('function');
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.remove).toBe('function');
    });

    it('should have access policies defined', () => {
      expect(AdminController.accessPolicies).toBeDefined();
      expect(AdminController.accessPolicies.getActiveAdmins).toBeDefined();
      expect(AdminController.accessPolicies.assignAdminRole).toBeDefined();
    });
  });

  describe('getActiveAdmins - GET /admin/active', () => {
    it('should return formatted active admins', async () => {
      adminService.getFormattedActiveAdmins!.mockResolvedValue(
        mockActiveAdminsResponse
      );

      const req = createMockRequest();
      const result = await controller.getActiveAdmins(req as Request);

      expect(result).toEqual({
        success: true,
        data: mockActiveAdminsResponse,
      });
      expect(adminService.getFormattedActiveAdmins).toHaveBeenCalledWith(
        'requester-id'
      );
      expect(adminService.getFormattedActiveAdmins).toHaveBeenCalledTimes(1);
    });

    it('should handle empty active admins list', async () => {
      const emptyResponse = {
        admins: [],
        count: 0,
        retrievedAt: '2024-01-15T10:00:00.000Z',
        retrievedBy: 'requester-id',
      };
      adminService.getFormattedActiveAdmins!.mockResolvedValue(emptyResponse);

      const req = createMockRequest();
      const result = await controller.getActiveAdmins(req as Request);

      expect(result.data.count).toBe(0);
      expect(result.data.admins).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      adminService.getFormattedActiveAdmins!.mockRejectedValue(serviceError);

      const req = createMockRequest();

      await expect(controller.getActiveAdmins(req as Request)).rejects.toThrow(
        serviceError
      );
    });
  });

  describe('getAdminHistory - GET /admin/history/:userId', () => {
    it('should return formatted admin history', async () => {
      adminService.getFormattedAdminHistory!.mockResolvedValue(
        mockAdminHistoryResponse
      );

      const req = createMockRequest();
      const result = await controller.getAdminHistory('user1', req as Request);

      expect(result).toEqual({
        success: true,
        data: mockAdminHistoryResponse,
      });
      expect(adminService.getFormattedAdminHistory).toHaveBeenCalledWith(
        'user1',
        'requester-id'
      );
      expect(adminService.getFormattedAdminHistory).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid userId format', async () => {
      // UUID validation happens at parameter level, so we test service error
      const validationError = new BadRequestException('Invalid UUID');
      adminService.getFormattedAdminHistory!.mockRejectedValue(validationError);

      const req = createMockRequest();

      await expect(
        controller.getAdminHistory('invalid-id', req as Request)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyAdminHistory - GET /admin/my-history', () => {
    it('should return current user admin history', async () => {
      adminService.getMyAdminHistory!.mockResolvedValue(mockMyHistoryResponse);

      const req = createMockRequest('user1');
      const result = await controller.getMyAdminHistory(req as Request);

      expect(result).toEqual({
        success: true,
        data: mockMyHistoryResponse,
      });
      expect(adminService.getMyAdminHistory).toHaveBeenCalledWith('user1');
      expect(adminService.getMyAdminHistory).toHaveBeenCalledTimes(1);
    });

    it('should handle user without admin history', async () => {
      const emptyHistory = {
        history: [],
        count: 0,
        retrievedAt: '2024-01-15T10:00:00.000Z',
      };
      adminService.getMyAdminHistory!.mockResolvedValue(emptyHistory);

      const req = createMockRequest('user-no-history');
      const result = await controller.getMyAdminHistory(req as Request);

      expect(result.data.count).toBe(0);
      expect(result.data.history).toHaveLength(0);
    });
  });

  describe('assignAdminRole - POST /admin/assign', () => {
    it('should assign admin role successfully', async () => {
      const createDto: CreateAdminDto = {
        userId: 'user1',
      } as CreateAdminDto;
      adminService.processAdminAssignment!.mockResolvedValue(
        mockAssignmentResponse
      );

      const req = createMockRequest();
      const result = await controller.assignAdminRole(
        createDto,
        req as Request
      );

      expect(result).toEqual({
        success: true,
        data: mockAssignmentResponse,
      });
      expect(adminService.processAdminAssignment).toHaveBeenCalledWith(
        'user1',
        'requester-id'
      );
      expect(adminService.processAdminAssignment).toHaveBeenCalledTimes(1);
    });

    it('should handle user not found error', async () => {
      const createDto: CreateAdminDto = {
        userId: 'nonexistent',
      } as CreateAdminDto;
      adminService.processAdminAssignment!.mockRejectedValue(
        new NotFoundException('User not found')
      );

      const req = createMockRequest();

      await expect(
        controller.assignAdminRole(createDto, req as Request)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle user already admin error', async () => {
      const createDto: CreateAdminDto = { userId: 'user1' } as CreateAdminDto;
      adminService.processAdminAssignment!.mockRejectedValue(
        new BadRequestException('User is already a site administrator')
      );

      const req = createMockRequest();

      await expect(
        controller.assignAdminRole(createDto, req as Request)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeAdminRole - DELETE /admin/revoke/:userId', () => {
    it('should revoke admin role successfully', async () => {
      adminService.processAdminRevocation!.mockResolvedValue(
        mockRevocationResponse
      );

      const req = createMockRequest();
      const result = await controller.revokeAdminRole('user1', req as Request);

      expect(result).toEqual({
        success: true,
        data: mockRevocationResponse,
      });
      expect(adminService.processAdminRevocation).toHaveBeenCalledWith(
        'user1',
        'requester-id'
      );
      expect(adminService.processAdminRevocation).toHaveBeenCalledTimes(1);
    });

    it('should handle user not admin error', async () => {
      adminService.processAdminRevocation!.mockRejectedValue(
        new NotFoundException('User is not a site administrator')
      );

      const req = createMockRequest();

      await expect(
        controller.revokeAdminRole('user1', req as Request)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle already inactive admin error', async () => {
      adminService.processAdminRevocation!.mockRejectedValue(
        new BadRequestException('User admin role is already inactive')
      );

      const req = createMockRequest();

      await expect(
        controller.revokeAdminRole('user1', req as Request)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkAdminStatus - GET /admin/check/:userId', () => {
    it('should check admin status successfully', async () => {
      adminService.checkAdminStatus!.mockResolvedValue(mockStatusResponse);

      const req = createMockRequest();
      const result = await controller.checkAdminStatus('user1', req as Request);

      expect(result).toEqual({
        success: true,
        data: mockStatusResponse,
      });
      expect(adminService.checkAdminStatus).toHaveBeenCalledWith(
        'user1',
        'requester-id'
      );
      expect(adminService.checkAdminStatus).toHaveBeenCalledTimes(1);
    });

    it('should return status for non-admin user', async () => {
      const nonAdminStatus = {
        userId: 'user2',
        isAdmin: false,
        adminInfo: null,
        checkedAt: '2024-01-15T10:00:00.000Z',
        checkedBy: 'requester-id',
      };
      adminService.checkAdminStatus!.mockResolvedValue(nonAdminStatus);

      const req = createMockRequest();
      const result = await controller.checkAdminStatus('user2', req as Request);

      expect(result.data.isAdmin).toBe(false);
      expect(result.data.adminInfo).toBeNull();
    });
  });

  describe('getAdminStats - GET /admin/stats', () => {
    it('should return admin statistics', async () => {
      adminService.getAdminStats!.mockResolvedValue(mockStatsResponse);

      const req = createMockRequest();
      const result = await controller.getAdminStats(req as Request);

      expect(result).toEqual({
        success: true,
        data: mockStatsResponse,
      });
      expect(adminService.getAdminStats).toHaveBeenCalledWith('requester-id');
      expect(adminService.getAdminStats).toHaveBeenCalledTimes(1);
    });

    it('should handle stats with no admins', async () => {
      const emptyStats = {
        stats: {
          total: 0,
          active: 0,
          inactive: 0,
          recentAssignments: 0,
          trends: {
            assignmentsByMonth: {},
          },
        },
        generatedAt: '2024-01-15T10:00:00.000Z',
        generatedBy: 'requester-id',
      };
      adminService.getAdminStats!.mockResolvedValue(emptyStats);

      const req = createMockRequest();
      const result = await controller.getAdminStats(req as Request);

      expect(result.data.stats.total).toBe(0);
    });
  });

  describe('searchAdmins - GET /admin/search', () => {
    it('should search admins with query', async () => {
      adminService.searchAdmins!.mockResolvedValue(mockSearchResponse);

      const req = createMockRequest();
      const result = await controller.searchAdmins(
        'john',
        true,
        req as Request
      );

      expect(result).toEqual({
        success: true,
        data: mockSearchResponse,
      });
      expect(adminService.searchAdmins).toHaveBeenCalledWith(
        'john',
        true,
        'requester-id'
      );
      expect(adminService.searchAdmins).toHaveBeenCalledTimes(1);
    });

    it('should search including inactive admins', async () => {
      adminService.searchAdmins!.mockResolvedValue(mockSearchResponse);

      const req = createMockRequest();
      await controller.searchAdmins('john', false, req as Request);

      expect(adminService.searchAdmins).toHaveBeenCalledWith(
        'john',
        false,
        'requester-id'
      );
    });

    it('should handle empty search results', async () => {
      const emptySearch = {
        searchQuery: 'nomatch',
        results: [],
        count: 0,
        searchedAt: '2024-01-15T10:00:00.000Z',
        searchedBy: 'requester-id',
      };
      adminService.searchAdmins!.mockResolvedValue(emptySearch);

      const req = createMockRequest();
      const result = await controller.searchAdmins(
        'nomatch',
        true,
        req as Request
      );

      expect(result.data.count).toBe(0);
      expect(result.data.results).toHaveLength(0);
    });

    it('should handle short search query error', async () => {
      adminService.searchAdmins!.mockRejectedValue(
        new BadRequestException(
          'Search query must be at least 2 characters long'
        )
      );

      const req = createMockRequest();

      await expect(
        controller.searchAdmins('a', true, req as Request)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('inherited BaseController methods', () => {
    const mockAdminList: Admin[] = [mockAdmin];
    const mockCreateDto: CreateAdminDto = { userId: 'user3' } as CreateAdminDto;
    const mockUpdateDto: UpdateAdminDto = {};

    describe('findAll - GET /', () => {
      it('should return all admins', async () => {
        adminService.findAll!.mockResolvedValue(mockAdminList);

        const result = await controller.findAll();

        expect(result).toEqual(mockAdminList);
        expect(adminService.findAll).toHaveBeenCalledTimes(1);
      });
    });

    describe('findOne - GET /:id', () => {
      it('should return admin by id', async () => {
        adminService.findOne!.mockResolvedValue(mockAdmin);

        const result = await controller.findOne('admin1');

        expect(result).toEqual(mockAdmin);
        expect(adminService.findOne).toHaveBeenCalledWith('admin1');
      });

      it('should throw NotFoundException when not found', async () => {
        adminService.findOne!.mockRejectedValue(
          new NotFoundException('Admin not found')
        );

        await expect(controller.findOne('nonexistent')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('create - POST /', () => {
      it('should create new admin', async () => {
        adminService.create!.mockResolvedValue(mockAdmin);

        const result = await controller.create(mockCreateDto);

        expect(result).toEqual(mockAdmin);
        expect(adminService.create).toHaveBeenCalledWith(mockCreateDto);
      });
    });

    describe('update - PUT /:id', () => {
      it('should update admin', async () => {
        adminService.update!.mockResolvedValue(mockAdmin);

        const result = await controller.update('admin1', mockUpdateDto);

        expect(result).toEqual(mockAdmin);
        expect(adminService.update).toHaveBeenCalledWith(
          'admin1',
          mockUpdateDto
        );
      });
    });

    describe('remove - DELETE /:id', () => {
      it('should remove admin', async () => {
        adminService.remove!.mockResolvedValue(undefined);

        await controller.remove('admin1');

        expect(adminService.remove).toHaveBeenCalledWith('admin1');
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent requests', async () => {
      adminService.getFormattedActiveAdmins!.mockResolvedValue(
        mockActiveAdminsResponse
      );

      const req = createMockRequest();
      const promises = [
        controller.getActiveAdmins(req as Request),
        controller.getActiveAdmins(req as Request),
        controller.getActiveAdmins(req as Request),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(adminService.getFormattedActiveAdmins).toHaveBeenCalledTimes(3);
    });

    it('should handle missing user in request', async () => {
      const reqWithoutUser = {} as Request;

      adminService.getFormattedActiveAdmins!.mockResolvedValue(
        mockActiveAdminsResponse
      );

      await controller.getActiveAdmins(reqWithoutUser);

      expect(adminService.getFormattedActiveAdmins).toHaveBeenCalledWith(
        undefined
      );
    });

    it('should handle service timeouts', async () => {
      const timeoutError = new Error('Service timeout');
      adminService.getAdminStats!.mockRejectedValue(timeoutError);

      const req = createMockRequest();

      await expect(controller.getAdminStats(req as Request)).rejects.toThrow(
        timeoutError
      );
    });
  });

  describe('response format consistency', () => {
    it('should return success wrapper for all endpoints', async () => {
      adminService.getFormattedActiveAdmins!.mockResolvedValue(
        mockActiveAdminsResponse
      );
      adminService.getAdminStats!.mockResolvedValue(mockStatsResponse);
      adminService.searchAdmins!.mockResolvedValue(mockSearchResponse);

      const req = createMockRequest();

      const activeResult = await controller.getActiveAdmins(req as Request);
      const statsResult = await controller.getAdminStats(req as Request);
      const searchResult = await controller.searchAdmins(
        'test',
        true,
        req as Request
      );

      expect(activeResult).toHaveProperty('success', true);
      expect(activeResult).toHaveProperty('data');
      expect(statsResult).toHaveProperty('success', true);
      expect(statsResult).toHaveProperty('data');
      expect(searchResult).toHaveProperty('success', true);
      expect(searchResult).toHaveProperty('data');
    });
  });
});
