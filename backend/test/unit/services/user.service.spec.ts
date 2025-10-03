import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/modules/user/user.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import { StoreService } from 'src/modules/store/store.service';
import { UserMapper } from 'src/modules/user/user.mapper';
import * as bcrypt from 'bcrypt';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { AdminRoles } from 'src/common/enums/admin.enum';
import {
  createMapperMock,
  createRepositoryMock,
  createServiceMock,
  MockedMethods,
} from '../utils/helpers';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/modules/user/dto/update-user.dto';
import { User } from 'src/entities/user/user.entity';
import { UserDto } from 'src/modules/user/dto/user.dto';
import { DeleteResult } from 'typeorm';
import { Store } from 'src/entities/store/store.entity';
import { StoreRole } from 'src/entities/user/policy/store-role.entity';
import { CreateStoreDto } from 'src/modules/store/dto/create-store.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepo: Partial<MockedMethods<UserRepository>>;
  let storeRoleService: Partial<MockedMethods<StoreRoleService>>;
  let storeService: Partial<MockedMethods<StoreService>>;
  let mapper: Partial<MockedMethods<UserMapper>>;

  const mockUser: User = {
    id: 'u1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    siteRole: AdminRoles.USER,
    isEmailVerified: false,
    isActive: true,
    roles: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as User;

  const mockStore: Store = {
    id: 's1',
    name: 'Test Store',
    owner: mockUser,
  } as Store;

  const mockStoreRole: StoreRole = {
    id: 'sr1',
    user: mockUser,
    store: mockStore,
    roleName: StoreRoles.ADMIN,
    assignedAt: new Date('2024-01-01'),
  } as StoreRole;

  beforeEach(async () => {
    userRepo = createRepositoryMock<UserRepository>([
      'findByEmail',
      'save',
      'findOneBy',
      'findOne',
      'getUserWithPassword',
      'findOneWithRelations',
      'addRoleToUser',
      'removeRoleFromUser',
      'update',
    ]);

    storeRoleService = createServiceMock<StoreRoleService>([
      'findByStoreUser',
      'create',
      'assignStoreRole',
      'userHasStoreRole',
      'userIsStoreAdmin',
    ]);

    storeService = createServiceMock<StoreService>(['getEntityById', 'create']);

    mapper = createMapperMock<UserMapper>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepo },
        { provide: StoreRoleService, useValue: storeRoleService },
        { provide: StoreService, useValue: storeService },
        { provide: UserMapper, useValue: mapper },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(UserService);
    });
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-pass' as never);
    });

    it('should create a user when email not used', async () => {
      userRepo.findByEmail!.mockResolvedValue(null);

      const entity = {
        email: createDto.email,
        password: createDto.password,
      } as unknown as User;

      mapper.toEntity!.mockReturnValue(entity);

      const saved = {
        ...entity,
        id: 'u2',
        passwordHash: 'hashed-pass',
      };

      userRepo.save!.mockResolvedValue(saved);

      const userDto: UserDto = {
        id: 'u2',
        email: createDto.email,
      } as UserDto;

      mapper.toDto!.mockReturnValue(userDto);

      const result = await service.create(createDto);

      expect(userRepo.findByEmail).toHaveBeenCalledWith(createDto.email);
      expect(mapper.toEntity).toHaveBeenCalledWith(createDto);
      expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 10);
      expect(userRepo.save).toHaveBeenCalled();
      expect(mapper.toDto).toHaveBeenCalledWith(saved);
      expect(result).toEqual(userDto);
    });

    it('should throw BadRequestException when email already exists', async () => {
      userRepo.findByEmail!.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Email already in use'
      );
    });

    it('should hash password before saving', async () => {
      userRepo.findByEmail!.mockResolvedValue(null);
      mapper.toEntity!.mockReturnValue({} as User);
      userRepo.save!.mockResolvedValue(mockUser);
      mapper.toDto!.mockReturnValue({} as UserDto);

      await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 10);
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      password: 'newpassword',
      email: 'updated@example.com',
      firstName: 'Updated',
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);
    });

    it('should update user and hash new password', async () => {
      const user = { ...mockUser };
      userRepo.findOneBy!.mockResolvedValue(user);
      userRepo.save!.mockImplementation(async (u) => ({ ...u }) as any);
      mapper.toDto!.mockImplementation(
        (u) => ({ id: u.id, email: u.email }) as any
      );

      const result = await service.update('u1', updateDto);

      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
      expect(bcrypt.hash).toHaveBeenCalledWith(updateDto.password, 10);
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.email).toBe('updated@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOneBy!.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'User not found'
      );
    });

    it('should not hash password if not provided', async () => {
      const dtoWithoutPassword = { email: 'updated@example.com' };
      userRepo.findOneBy!.mockResolvedValue(mockUser);
      userRepo.save!.mockResolvedValue(mockUser);
      mapper.toDto!.mockReturnValue({} as UserDto);

      await service.update('u1', dtoWithoutPassword);

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user dto when found', async () => {
      userRepo.findOneBy!.mockResolvedValue(mockUser);
      mapper.toDto!.mockReturnValue({
        id: 'u1',
        email: mockUser.email,
      } as UserDto);

      const result = await service.findByEmail(mockUser.email);

      expect(userRepo.findOneBy).toHaveBeenCalledWith({
        email: mockUser.email,
      });
      expect(result).toEqual({ id: 'u1', email: mockUser.email });
    });

    it('should throw NotFoundException when not found', async () => {
      userRepo.findOneBy!.mockResolvedValue(null);

      await expect(service.findByEmail('nobody@example.com')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findUserWithPassword', () => {
    it('should delegate to repository', async () => {
      userRepo.getUserWithPassword!.mockResolvedValue(mockUser);

      const result = await service.findUserWithPassword('user@example.com');

      expect(userRepo.getUserWithPassword).toHaveBeenCalledWith(
        'user@example.com'
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneWithRelations', () => {
    it('should return user with relations when found', async () => {
      const userWithRoles = { ...mockUser, roles: [mockStoreRole] };
      userRepo.findOneWithRelations!.mockResolvedValue(userWithRoles);

      const result = await service.findOneWithRelations('u1');

      expect(userRepo.findOneWithRelations).toHaveBeenCalledWith('u1');
      expect(result).toEqual(userWithRoles);
    });

    it('should throw NotFoundException when not found', async () => {
      userRepo.findOneWithRelations!.mockResolvedValue(null);

      await expect(service.findOneWithRelations('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getUserStoreRoles', () => {
    it('should return user store roles', async () => {
      const userWithRoles = { ...mockUser, roles: [mockStoreRole] };
      userRepo.findOneWithRelations!.mockResolvedValue(userWithRoles);

      const result = await service.getUserStoreRoles('u1');

      expect(result).toEqual([mockStoreRole]);
    });
  });

  describe('assignStoreRole', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(mockUser);
      storeService.getEntityById!.mockResolvedValue(mockStore);
      storeRoleService.findByStoreUser!.mockResolvedValue(null);
      storeRoleService.assignStoreRole!.mockResolvedValue(mockStoreRole);
      userRepo.addRoleToUser!.mockResolvedValue({
        ...mockUser,
        roles: [mockStoreRole],
      });
    });

    it('should assign role when everything is valid', async () => {
      const result = await service.assignStoreRole(
        'u1',
        StoreRoles.ADMIN,
        's1',
        'admin1'
      );

      expect(service.getEntityById).toHaveBeenCalledWith('u1');
      expect(storeService.getEntityById).toHaveBeenCalledWith('s1');
      expect(storeRoleService.findByStoreUser).toHaveBeenCalledWith('u1', 's1');
      expect(storeRoleService.assignStoreRole).toHaveBeenCalled();
      expect(userRepo.addRoleToUser).toHaveBeenCalled();
      expect(result).toEqual(mockStoreRole);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);

      await expect(
        service.assignStoreRole('nonexistent', StoreRoles.ADMIN, 's1')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.assignStoreRole('nonexistent', StoreRoles.ADMIN, 's1')
      ).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException when store not found', async () => {
      storeService.getEntityById!.mockResolvedValue(null);

      await expect(
        service.assignStoreRole('u1', StoreRoles.ADMIN, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.assignStoreRole('u1', StoreRoles.ADMIN, 'nonexistent')
      ).rejects.toThrow('Store not found');
    });

    it('should throw BadRequestException when role already exists', async () => {
      storeRoleService.findByStoreUser!.mockResolvedValue(mockStoreRole);

      await expect(
        service.assignStoreRole('u1', StoreRoles.ADMIN, 's1')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignStoreRole('u1', StoreRoles.ADMIN, 's1')
      ).rejects.toThrow('Role already assigned');
    });
  });

  describe('revokeStoreRole', () => {
    it('should revoke store role', async () => {
      userRepo.removeRoleFromUser!.mockResolvedValue(
        true as unknown as DeleteResult
      );

      await service.revokeStoreRole('u1', 'sr1', 's1');

      expect(userRepo.removeRoleFromUser).toHaveBeenCalledWith(
        'u1',
        'sr1',
        's1'
      );
    });
  });

  describe('createStore', () => {
    const createStoreDto: CreateStoreDto = {
      name: 'New Store',
      description: 'Test store description',
    } as CreateStoreDto;

    it('should create store and assign owner role', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(mockUser);
      storeService.create!.mockResolvedValue(mockStore);
      jest.spyOn(service, 'assignStoreRole').mockResolvedValue(mockStoreRole);

      const result = await service.createStore('u1', createStoreDto);

      expect(service.getEntityById).toHaveBeenCalledWith('u1');
      expect(storeService.create).toHaveBeenCalledWith({
        ...createStoreDto,
        owner: mockUser,
      });
      expect(service.assignStoreRole).toHaveBeenCalledWith(
        'u1',
        StoreRoles.ADMIN,
        's1'
      );
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException when owner not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);

      await expect(
        service.createStore('nonexistent', createStoreDto)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createStore('nonexistent', createStoreDto)
      ).rejects.toThrow('Store owner not found');
    });
  });

  describe('isUserSiteAdmin', () => {
    it('should return true when user is site admin', async () => {
      const adminUser = { ...mockUser, siteRole: AdminRoles.ADMIN };
      userRepo.findOneWithRelations!.mockResolvedValue(adminUser);

      const result = await service.isUserSiteAdmin('u1');

      expect(result).toBe(true);
    });

    it('should return false when user is not site admin', async () => {
      userRepo.findOneWithRelations!.mockResolvedValue(mockUser);

      const result = await service.isUserSiteAdmin('u1');

      expect(result).toBe(false);
    });
  });

  describe('assignSiteAdminRole', () => {
    it('should assign site admin role to user', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(mockUser);
      jest.spyOn(service, 'update').mockResolvedValue({
        ...mockUser,
        siteRole: AdminRoles.ADMIN,
      } as any);

      const result = await service.assignSiteAdminRole('u1');

      expect(service.getEntityById).toHaveBeenCalledWith('u1');
      expect(service.update).toHaveBeenCalledWith('u1', {
        siteRole: AdminRoles.ADMIN,
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);

      await expect(service.assignSiteAdminRole('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('markAsVerified', () => {
    it('should mark user email as verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      jest
        .spyOn(service, 'getEntityById')
        .mockResolvedValueOnce(unverifiedUser)
        .mockResolvedValueOnce({ ...unverifiedUser, isEmailVerified: true });

      userRepo.update!.mockResolvedValue(undefined as any);

      const result = await service.markAsVerified('u1');

      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date),
      });
      expect(result?.isEmailVerified).toBe(true);
    });

    it('should return user without update if already verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      jest.spyOn(service, 'getEntityById').mockResolvedValue(verifiedUser);

      const result = await service.markAsVerified('u1');

      expect(userRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual(verifiedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);

      await expect(service.markAsVerified('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('isEmailVerified', () => {
    it('should return true when email is verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      jest.spyOn(service, 'getEntityById').mockResolvedValue(verifiedUser);

      const result = await service.isEmailVerified('u1');

      expect(result).toBe(true);
    });

    it('should return false when email is not verified', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(mockUser);

      const result = await service.isEmailVerified('u1');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);

      const result = await service.isEmailVerified('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('userHasStoreRole', () => {
    it('should delegate to storeRoleService', async () => {
      storeRoleService.userHasStoreRole!.mockResolvedValue(true);

      const result = await service.userHasStoreRole(
        'u1',
        's1',
        StoreRoles.ADMIN
      );

      expect(storeRoleService.userHasStoreRole).toHaveBeenCalledWith(
        'u1',
        's1',
        StoreRoles.ADMIN
      );
      expect(result).toBe(true);
    });
  });

  describe('userIsStoreAdmin', () => {
    it('should delegate to storeRoleService', async () => {
      storeRoleService.userIsStoreAdmin!.mockResolvedValue(true);

      const result = await service.userIsStoreAdmin('u1', 's1');

      expect(storeRoleService.userIsStoreAdmin).toHaveBeenCalledWith(
        'u1',
        's1'
      );
      expect(result).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('should return user profile with store roles', async () => {
      const userWithRoles = {
        ...mockUser,
        isEmailVerified: true,
        emailVerifiedAt: new Date('2024-01-15'),
      };

      jest.spyOn(service, 'getEntityById').mockResolvedValue(userWithRoles);
      jest.spyOn(service, 'getUserStoreRoles').mockResolvedValue([
        {
          ...mockStoreRole,
          store: mockStore,
        },
      ]);

      const result = await service.getProfile('u1');

      expect(result).toEqual({
        id: 'u1',
        email: mockUser.email,
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date),
        storeRoles: [
          {
            storeId: 's1',
            storeName: 'Test Store',
            roleName: StoreRoles.ADMIN,
            assignedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
      });
    });

    it('should return null when user not found', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(null);

      const result = await service.getProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle user without store roles', async () => {
      jest.spyOn(service, 'getEntityById').mockResolvedValue(mockUser);
      jest.spyOn(service, 'getUserStoreRoles').mockResolvedValue([]);

      const result = await service.getProfile('u1');

      expect(result?.storeRoles).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    const updates = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update user profile', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser as any);
      userRepo.update!.mockResolvedValue(undefined as any);
      jest.spyOn(service, 'getEntityById').mockResolvedValue({
        ...mockUser,
        ...updates,
      });

      const result = await service.updateProfile('u1', updates);

      expect(userRepo.update).toHaveBeenCalledWith('u1', updates);
      expect(result?.firstName).toBe('Jane');
      expect(result?.lastName).toBe('Smith');
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null as any);

      await expect(
        service.updateProfile('nonexistent', updates)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser as any);
      userRepo.update!.mockResolvedValue(undefined as any);

      await service.deactivateAccount('u1');

      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        isActive: false,
        deactivatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null as any);

      await expect(service.deactivateAccount('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('reactivateAccount', () => {
    it('should reactivate user account', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser as any);
      userRepo.update!.mockResolvedValue(undefined as any);

      await service.reactivateAccount('u1');

      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        isActive: true,
        deactivatedAt: undefined,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null as any);

      await expect(service.reactivateAccount('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent operations', async () => {
      userRepo.findOneBy!.mockResolvedValue(mockUser);
      mapper.toDto!.mockReturnValue({} as UserDto);

      const promises = [
        service.findByEmail('user@example.com'),
        service.findByEmail('user@example.com'),
        service.findByEmail('user@example.com'),
      ];

      await Promise.all(promises);

      expect(userRepo.findOneBy).toHaveBeenCalledTimes(3);
    });

    it('should handle bcrypt hashing errors', async () => {
      userRepo.findByEmail!.mockResolvedValue(null);
      mapper.toEntity!.mockReturnValue({} as User);
      jest
        .spyOn(bcrypt, 'hash')
        .mockRejectedValue(new Error('Hashing failed') as never);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password',
        } as CreateUserDto)
      ).rejects.toThrow('Hashing failed');
    });
  });
});
