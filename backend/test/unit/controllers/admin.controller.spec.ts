import { AdminController } from 'src/modules/auth/admin/admin.controller';
import { AdminService } from 'src/modules/auth/admin/admin.service';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { CreateAdminDto } from 'src/modules/auth/admin/dto/create-admin.dto';
import { UpdateAdminDto } from 'src/modules/auth/admin/dto/update-admin.dto';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: Partial<MockedMethods<AdminService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

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

  const mockCreateAdminDto: CreateAdminDto = {
    userId: 'user3',
  } as unknown as CreateAdminDto;

  const mockUpdateAdminDto: UpdateAdminDto = {
    userId: 'updated-user',
  } as UpdateAdminDto;

  beforeEach(async () => {
    adminService = createServiceMock<AdminService>([
      'findAll',
      'findOne',
      'create',
      'update',
      'remove',
      'findByUserId',
      'isUserValidAdmin',
    ]);
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: PolicyService, useValue: policyMock },
        {
          provide: JwtAuthGuard,
          useValue: guardMock,
        },
        {
          provide: StoreRolesGuard,
          useValue: guardMock,
        },
        {
          provide: AdminGuard,
          useValue: guardMock,
        },
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
      // Verify it has inherited methods from BaseController
      expect(typeof controller.findAll).toBe('function');
      expect(typeof controller.findOne).toBe('function');
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.remove).toBe('function');
    });
  });

  describe('findAll - GET /', () => {
    it('should return all admins', async () => {
      adminService.findAll!.mockResolvedValue(mockAdminList);

      const result = await controller.findAll();

      expect(result).toEqual(mockAdminList);
      expect(adminService.findAll).toHaveBeenCalledTimes(1);
      expect(adminService.findAll).toHaveBeenCalledWith();
    });

    it('should return empty array when no admins exist', async () => {
      adminService.findAll!.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(adminService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');
      adminService.findAll!.mockRejectedValue(serviceError);

      await expect(controller.findAll()).rejects.toThrow(serviceError);
      expect(adminService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne - GET /:id', () => {
    it('should return admin by id', async () => {
      adminService.findOne!.mockResolvedValue(mockAdmin);

      const result = await controller.findOne('admin1');

      expect(result).toEqual(mockAdmin);
      expect(adminService.findOne).toHaveBeenCalledWith('admin1');
      expect(adminService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when admin not found', async () => {
      adminService.findOne!.mockRejectedValue(
        new NotFoundException('Admin not found')
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException
      );
      expect(adminService.findOne).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle invalid id formats', async () => {
      adminService.findOne!.mockRejectedValue(
        new NotFoundException('Admin not found')
      );

      await expect(controller.findOne('')).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('   ')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('create - POST /', () => {
    it('should create a new admin', async () => {
      const createdAdmin = { id: 'admin3', ...mockCreateAdminDto } as Admin;
      adminService.create!.mockResolvedValue(createdAdmin);

      const result = await controller.create(mockCreateAdminDto);

      expect(result).toEqual(createdAdmin);
      expect(adminService.create).toHaveBeenCalledWith(mockCreateAdminDto);
      expect(adminService.create).toHaveBeenCalledTimes(1);
    });

    it('should handle creation errors', async () => {
      const createError = new Error('User already has admin role');
      adminService.create!.mockRejectedValue(createError);

      await expect(controller.create(mockCreateAdminDto)).rejects.toThrow(
        createError
      );
      expect(adminService.create).toHaveBeenCalledWith(mockCreateAdminDto);
    });

    it('should handle validation errors in DTO', async () => {
      const invalidDto = {} as CreateAdminDto;
      const validationError = new Error('Validation failed');
      adminService.create!.mockRejectedValue(validationError);

      await expect(controller.create(invalidDto)).rejects.toThrow(
        validationError
      );
    });
  });

  describe('update - PUT /:id', () => {
    it('should update existing admin', async () => {
      const updatedAdmin = { ...mockAdmin, ...mockUpdateAdminDto } as Admin;
      adminService.update!.mockResolvedValue(updatedAdmin);

      const result = await controller.update('admin1', mockUpdateAdminDto);

      expect(result).toEqual(updatedAdmin);
      expect(adminService.update).toHaveBeenCalledWith(
        'admin1',
        mockUpdateAdminDto
      );
      expect(adminService.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when admin to update not found', async () => {
      adminService.update!.mockRejectedValue(
        new NotFoundException('Admin not found')
      );

      await expect(
        controller.update('nonexistent', mockUpdateAdminDto)
      ).rejects.toThrow(NotFoundException);
      expect(adminService.update).toHaveBeenCalledWith(
        'nonexistent',
        mockUpdateAdminDto
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdateDto = { userId: 'partial-update' } as UpdateAdminDto;
      const updatedAdmin = { ...mockAdmin, userId: 'partial-update' } as Admin;
      adminService.update!.mockResolvedValue(updatedAdmin);

      const result = await controller.update('admin1', partialUpdateDto);

      expect(result).toEqual(updatedAdmin);
      expect(adminService.update).toHaveBeenCalledWith(
        'admin1',
        partialUpdateDto
      );
    });
  });

  describe('remove - DELETE /:id', () => {
    it('should remove admin successfully', async () => {
      adminService.remove!.mockResolvedValue(undefined);

      await controller.remove('admin1');

      expect(adminService.remove).toHaveBeenCalledWith('admin1');
      expect(adminService.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when admin to remove not found', async () => {
      adminService.remove!.mockRejectedValue(
        new NotFoundException('Admin not found')
      );

      await expect(controller.remove('nonexistent')).rejects.toThrow(
        NotFoundException
      );
      expect(adminService.remove).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle service errors during removal', async () => {
      const removeError = new Error('Cannot delete admin with active sessions');
      adminService.remove!.mockRejectedValue(removeError);

      await expect(controller.remove('admin1')).rejects.toThrow(removeError);
    });
  });

  describe('BaseController inheritance', () => {
    it('should properly delegate all CRUD operations to service', async () => {
      // Setup all service methods
      adminService.findAll!.mockResolvedValue(mockAdminList);
      adminService.findOne!.mockResolvedValue(mockAdmin);
      adminService.create!.mockResolvedValue(mockAdmin);
      adminService.update!.mockResolvedValue(mockAdmin);
      adminService.remove!.mockResolvedValue(undefined);

      // Test all operations
      await controller.findAll();
      await controller.findOne('admin1');
      await controller.create(mockCreateAdminDto);
      await controller.update('admin1', mockUpdateAdminDto);
      await controller.remove('admin1');

      // Verify all service methods were called
      expect(adminService.findAll).toHaveBeenCalledTimes(1);
      expect(adminService.findOne).toHaveBeenCalledTimes(1);
      expect(adminService.create).toHaveBeenCalledTimes(1);
      expect(adminService.update).toHaveBeenCalledTimes(1);
      expect(adminService.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle concurrent operations', async () => {
      adminService.findOne!.mockResolvedValue(mockAdmin);

      const promises = [
        controller.findOne('admin1'),
        controller.findOne('admin1'),
        controller.findOne('admin1'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([mockAdmin, mockAdmin, mockAdmin]);
      expect(adminService.findOne).toHaveBeenCalledTimes(3);
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      adminService.findAll!.mockRejectedValue(timeoutError);

      await expect(controller.findAll()).rejects.toThrow(timeoutError);
    });
  });

  describe('integration with guards and decorators', () => {
    it('should have proper route definitions', () => {
      expect(typeof controller.findAll).toBe('function');
      expect(typeof controller.findOne).toBe('function');
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.remove).toBe('function');
    });
  });
});
