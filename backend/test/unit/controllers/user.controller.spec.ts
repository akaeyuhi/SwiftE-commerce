import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from 'src/modules/user/user.controller';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { RoleDto } from 'src/modules/user/dto/role.dto';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';
import { BadRequestException } from '@nestjs/common';
import {
  createGuardMock,
  createPolicyMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { jest } from '@jest/globals';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { Store } from 'src/entities/store/store.entity';
import { User } from 'src/entities/user/user.entity';

describe('UserController', () => {
  let controller: UserController;
  let service: Partial<MockedMethods<UserService>>;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  const mockUser = {
    id: 'u1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
  } as User;

  const mockRequest = {
    user: { id: 'u1', email: 'user@example.com' },
  } as any;

  beforeEach(async () => {
    policyMock = createPolicyMock();
    const guardMock = createGuardMock();

    service = createServiceMock<UserService>([
      'create',
      'assignStoreRole',
      'revokeStoreRole',
      'createStore',
      'getProfile',
      'updateProfile',
      'markAsVerified',
      'isEmailVerified',
      'userHasStoreRole',
      'userIsStoreAdmin',
      'getUserStoreRoles',
      'isUserSiteAdmin',
      'assignSiteAdminRole',
      'deactivateAccount',
      'reactivateAccount',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: service },
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

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should call userService.create and return dto', async () => {
      const dto: CreateUserDto = {
        email: 'a@b.com',
        password: 'p',
        firstName: 'f',
        lastName: 'f',
      };
      const out = { id: 'u1', email: dto.email } as any;
      service.create!.mockResolvedValue(out as never);

      const res = await controller.register(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual(out);
    });
  });

  describe('getProfile', () => {
    it('should get current user profile', async () => {
      const profileData = {
        id: 'u1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
        storeRoles: [],
      } as unknown as User;
      service.getProfile!.mockResolvedValue(profileData);

      const result = await controller.getProfile(mockRequest);

      expect(service.getProfile).toHaveBeenCalledWith('u1');
      expect(result).toEqual(profileData);
    });

    it('should throw BadRequestException when user ID not found', async () => {
      const requestWithoutUser = { user: null } as any;

      await expect(controller.getProfile(requestWithoutUser)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('updateProfile', () => {
    it('should update current user profile', async () => {
      const updates = { firstName: 'Jane', lastName: 'Smith' };
      service.updateProfile!.mockResolvedValue(mockUser);

      const result = await controller.updateProfile(mockRequest, updates);

      expect(service.updateProfile).toHaveBeenCalledWith('u1', updates);
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException when user ID not found', async () => {
      const requestWithoutUser = { user: null } as any;
      const updates = { firstName: 'Jane' };

      await expect(
        controller.updateProfile(requestWithoutUser, updates)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile by ID', async () => {
      const profileData = {
        id: 'u2',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
      } as User;
      service.getProfile!.mockResolvedValue(profileData);

      const result = await controller.getUserProfile('u2');

      expect(service.getProfile).toHaveBeenCalledWith('u2');
      expect(result).toEqual(profileData);
    });
  });

  describe('markAsVerified', () => {
    it('should mark user email as verified', async () => {
      service.markAsVerified!.mockResolvedValue(mockUser);

      const result = await controller.markAsVerified('u1');

      expect(service.markAsVerified).toHaveBeenCalledWith('u1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('isEmailVerified', () => {
    it('should check if user email is verified', async () => {
      service.isEmailVerified!.mockResolvedValue(true);

      const result = await controller.isEmailVerified('u1');

      expect(service.isEmailVerified).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ isEmailVerified: true });
    });

    it('should return false when email is not verified', async () => {
      service.isEmailVerified!.mockResolvedValue(false);

      const result = await controller.isEmailVerified('u1');

      expect(result).toEqual({ isEmailVerified: false });
    });
  });

  describe('userHasStoreRole', () => {
    it('should check if user has specific store role', async () => {
      service.userHasStoreRole!.mockResolvedValue(true);

      const result = await controller.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(service.userHasStoreRole).toHaveBeenCalledWith(
        'u1',
        's1',
        StoreRoles.ADMIN
      );
      expect(result).toEqual({ hasRole: true });
    });

    it('should return false when user does not have role', async () => {
      service.userHasStoreRole!.mockResolvedValue(false);

      const result = await controller.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.MODERATOR
      );

      expect(result).toEqual({ hasRole: false });
    });
  });

  describe('userIsStoreAdmin', () => {
    it('should check if user is store admin', async () => {
      service.userIsStoreAdmin!.mockResolvedValue(true);

      const result = await controller.userIsStoreAdmin('u1', 's1');

      expect(service.userIsStoreAdmin).toHaveBeenCalledWith('u1', 's1');
      expect(result).toEqual({ isStoreAdmin: true });
    });
  });

  describe('getUserStoreRoles', () => {
    it('should get user store roles', async () => {
      const roles = [
        {
          id: 'r1',
          roleName: StoreRoles.ADMIN,
          store: { id: 's1', name: 'Store 1' },
        },
      ];
      service.getUserStoreRoles!.mockResolvedValue(roles as any);

      const result = await controller.getUserStoreRoles('u1');

      expect(service.getUserStoreRoles).toHaveBeenCalledWith('u1');
      expect(result).toEqual(roles);
    });
  });

  describe('isUserSiteAdmin', () => {
    it('should check if user is site admin', async () => {
      service.isUserSiteAdmin!.mockResolvedValue(true);

      const result = await controller.isUserSiteAdmin('u1');

      expect(service.isUserSiteAdmin).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ isSiteAdmin: true });
    });
  });

  describe('assignSiteAdminRole', () => {
    it('should assign site admin role', async () => {
      const updatedUser = { ...mockUser, siteRole: 'admin' };
      service.assignSiteAdminRole!.mockResolvedValue(updatedUser as any);

      const result = await controller.assignSiteAdminRole('u1');

      expect(service.assignSiteAdminRole).toHaveBeenCalledWith('u1');
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account', async () => {
      service.deactivateAccount!.mockResolvedValue(undefined);

      const result = await controller.deactivateAccount('u1');

      expect(service.deactivateAccount).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ message: 'Account deactivated successfully' });
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate user account', async () => {
      service.reactivateAccount!.mockResolvedValue(undefined);

      const result = await controller.reactivateAccount('u1');

      expect(service.reactivateAccount).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ message: 'Account reactivated successfully' });
    });
  });

  describe('legacy methods', () => {
    it('assignRole should call userService.assignStoreRole', async () => {
      const roleDto: RoleDto = {
        roleName: StoreRoles.ADMIN,
        storeId: 's1',
        assignedBy: 'a1',
      };
      service.assignStoreRole!.mockResolvedValue({
        id: 'r1',
      } as StoreRole);

      const res = await controller.assignRole('u1', roleDto);

      expect(service.assignStoreRole).toHaveBeenCalledWith(
        'u1',
        roleDto.roleName,
        roleDto.storeId,
        roleDto.assignedBy
      );
      expect(res).toEqual({ id: 'r1' });
    });

    it('revokeStoreRole should call userService.revokeStoreRole', async () => {
      const roleDto: RoleDto = {
        roleName: StoreRoles.ADMIN,
        storeId: 's1',
      };
      service.revokeStoreRole!.mockResolvedValue(undefined);

      const res = await controller.revokeStoreRole('u1', roleDto);

      expect(service.revokeStoreRole).toHaveBeenCalledWith(
        'u1',
        roleDto.roleName,
        roleDto.storeId
      );
      expect(res).toBeUndefined();
    });

    it('createStore should call userService.createStore', async () => {
      const dto: CreateStoreDto = { name: 'MyStore' } as CreateStoreDto;
      const created = { id: 'store1', name: 'MyStore' } as Store;
      service.createStore!.mockResolvedValue(created);

      const res = await controller.createStore('owner1', dto);

      expect(service.createStore).toHaveBeenCalledWith('owner1', dto);
      expect(res).toEqual(created);
    });
  });

  describe('error handling', () => {
    it('should handle service errors in getProfile', async () => {
      service.getProfile!.mockRejectedValue(new Error('Service error'));

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        'Service error'
      );
    });

    it('should handle service errors in updateProfile', async () => {
      const updates = { firstName: 'Jane' };
      service.updateProfile!.mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.updateProfile(mockRequest, updates)
      ).rejects.toThrow('Update failed');
    });
  });
});
