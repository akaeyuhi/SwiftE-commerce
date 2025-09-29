import { AdminService } from 'src/modules/auth/admin/admin.service';
import { AdminRepository } from 'src/modules/auth/admin/admin.repository';
import { Admin } from 'src/entities/user/policy/admin.entity';
import { createRepositoryMock, MockedMethods } from '../utils/helpers';
import { NotFoundException } from '@nestjs/common';
import { CreateAdminDto } from 'src/modules/auth/admin/dto/create-admin.dto';
import { Test, TestingModule } from '@nestjs/testing';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepo: Partial<MockedMethods<AdminRepository>>;

  const mockAdmin: Admin = {
    id: 'admin1',
    user: { id: 'user1' },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Admin;

  const mockAdminList: Admin[] = [
    mockAdmin,
    {
      id: 'admin2',
      user: { id: 'user2' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Admin,
  ];

  beforeEach(async () => {
    adminRepo = createRepositoryMock<AdminRepository>([
      'findOne',
      'findAll',
      'findById',
      'createEntity',
      'updateEntity',
      'delete',
      'save',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AdminRepository, useValue: adminRepo },
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
      });
      expect(adminRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when admin not found by userId', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByUserId('nonexistent-user');

      expect(result).toBeNull();
      expect(adminRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 'nonexistent-user' } },
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
    it('should return true when user is a valid admin', async () => {
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

    it('should return false when findByUserId throws an error', async () => {
      jest
        .spyOn(service, 'findByUserId')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.isUserValidAdmin('user1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should convert truthy admin object to true', async () => {
      const adminWithMinimalData = { id: 'admin-minimal' } as Admin;
      jest
        .spyOn(service, 'findByUserId')
        .mockResolvedValue(adminWithMinimalData);

      const result = await service.isUserValidAdmin('user1');

      expect(result).toBe(true);
    });
  });

  describe('inherited BaseService methods', () => {
    describe('create', () => {
      it('should create a new admin', async () => {
        const createDto = { user: { id: 'user3' } } as CreateAdminDto;
        const createdAdmin = { id: 'admin3', ...createDto } as Admin;

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

      it('should return empty array when no admins exist', async () => {
        adminRepo.findAll!.mockResolvedValue([]);

        const result = await service.findAll();

        expect(result).toEqual([]);
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
        expect(adminRepo.findById).toHaveBeenCalledWith('nonexistent');
      });
    });

    describe('update', () => {
      it('should update existing admin', async () => {
        const updateDto = {
          user: { id: 'updated-user' },
        } as Partial<CreateAdminDto>;
        const updatedAdmin = { ...mockAdmin, ...updateDto };

        adminRepo.findById!.mockResolvedValue(mockAdmin);
        adminRepo.save!.mockResolvedValue(updatedAdmin as Admin);

        const result = await service.update('admin1', updateDto);

        expect(result).toEqual(updatedAdmin);
        expect(adminRepo.findById).toHaveBeenCalledWith('admin1');
        expect(adminRepo.save).toHaveBeenCalledWith({
          ...mockAdmin,
          ...updateDto,
        });
      });

      it('should throw NotFoundException when admin to update not found', async () => {
        adminRepo.findById!.mockResolvedValue(null);

        await expect(service.update('nonexistent', {})).rejects.toThrow(
          NotFoundException
        );
        expect(adminRepo.findById).toHaveBeenCalledWith('nonexistent');
        expect(adminRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('remove', () => {
      it('should remove admin successfully', async () => {
        adminRepo.delete!.mockResolvedValue({ affected: 1, raw: {} } as any);

        await service.remove('admin1');

        expect(adminRepo.delete).toHaveBeenCalledWith('admin1');
      });

      it('should throw NotFoundException when admin to remove not found', async () => {
        adminRepo.delete!.mockResolvedValue({ affected: 0, raw: {} } as any);

        await expect(service.remove('nonexistent')).rejects.toThrow(
          NotFoundException
        );
        expect(adminRepo.delete).toHaveBeenCalledWith('nonexistent');
      });
    });

    describe('getEntityById', () => {
      it('should return admin entity by id', async () => {
        adminRepo.findById!.mockResolvedValue(mockAdmin);

        const result = await service.getEntityById('admin1');

        expect(result).toEqual(mockAdmin);
        expect(adminRepo.findById).toHaveBeenCalledWith('admin1');
      });

      it('should return null when admin not found', async () => {
        adminRepo.findById!.mockResolvedValue(null);

        const result = await service.getEntityById('nonexistent');

        expect(result).toBeNull();
        expect(adminRepo.findById).toHaveBeenCalledWith('nonexistent');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle creating admin and then validating admin status', async () => {
      const createDto = { user: { id: 'user4' } } as CreateAdminDto;
      const createdAdmin = { id: 'admin4', ...createDto } as Admin;

      // Setup create flow
      adminRepo.createEntity!.mockResolvedValue(createdAdmin);

      // Setup validation flow
      adminRepo.findOne!.mockResolvedValue(createdAdmin);

      // Create admin
      const created = await service.create(createDto);
      expect(created).toEqual(createdAdmin);

      // Validate admin status
      const isValid = await service.isUserValidAdmin('user4');
      expect(isValid).toBe(true);
    });

    it('should handle admin removal and validation', async () => {
      // Setup removal
      adminRepo.delete!.mockResolvedValue({ affected: 1, raw: {} } as any);

      // Setup validation after removal
      adminRepo.findOne!.mockResolvedValue(null);

      // Remove admin
      await service.remove('admin1');

      // Validate admin status after removal
      const isValid = await service.isUserValidAdmin('user1');
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Connection timeout');
      adminRepo.findOne!.mockRejectedValue(dbError);

      await expect(service.findByUserId('user1')).rejects.toThrow(dbError);
    });

    it('should handle invalid userId formats', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByUserId('');
      expect(result).toBeNull();

      const result2 = await service.findByUserId('   ');
      expect(result2).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent findByUserId calls', async () => {
      adminRepo.findOne!.mockResolvedValue(mockAdmin);

      const promises = [
        service.findByUserId('user1'),
        service.findByUserId('user1'),
        service.findByUserId('user1'),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([mockAdmin, mockAdmin, mockAdmin]);
      expect(adminRepo.findOne).toHaveBeenCalledTimes(3);
    });

    it('should handle admin entity with partial data', async () => {
      const partialAdmin = { id: 'admin-partial' } as Admin;
      adminRepo.findOne!.mockResolvedValue(partialAdmin);

      const result = await service.findByUserId('user1');
      expect(result).toEqual(partialAdmin);

      const isValid = await service.isUserValidAdmin('user1');
      expect(isValid).toBe(true);
    });
  });
});
