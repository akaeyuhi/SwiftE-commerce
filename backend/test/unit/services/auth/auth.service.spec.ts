// test/modules/auth/auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/modules/auth/auth.service';
import { UserService } from 'src/modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from 'src/modules/auth/refresh-token/refresh-token.service';
import { ConfirmationService } from 'src/modules/auth/confirmation/confirmation.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { AdminService } from 'src/modules/admin/admin.service';
import { StoreRoleService } from 'src/modules/store/store-role/store-role.service';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  createMock,
  createServiceMock,
  MockedMethods,
} from '../../utils/helpers';
import { User } from 'src/entities/user/user.entity';
import { AdminRoles } from 'src/common/enums/admin.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { UserDto } from 'src/modules/user/dto/user.dto';
import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userService: Partial<MockedMethods<UserService>>;
  let jwtService: Partial<MockedMethods<JwtService>>;
  let refreshTokenService: Partial<MockedMethods<RefreshTokenService>>;
  let confirmationService: Partial<MockedMethods<ConfirmationService>>;
  let emailQueueService: Partial<MockedMethods<EmailQueueService>>;
  let adminService: Partial<MockedMethods<AdminService>>;
  let storeRoleService: Partial<MockedMethods<StoreRoleService>>;

  const mockUser: User = {
    id: 'u1',
    email: 'user@example.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    firstName: 'John',
    lastName: 'Doe',
    siteRole: AdminRoles.USER,
    isEmailVerified: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockVerifiedUser: User = {
    ...mockUser,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  };

  beforeEach(async () => {
    userService = createServiceMock<UserService>([
      'findByEmail',
      'findUserWithPassword',
      'create',
      'getEntityById',
    ]);

    jwtService = createMock<JwtService>(['signAsync']);

    refreshTokenService = createMock<RefreshTokenService>([
      'create',
      'findByToken',
      'removeByValue',
      'toggleBan',
    ]);

    confirmationService = createMock<ConfirmationService>([
      'sendAccountConfirmation',
      'getPendingConfirmations',
      'confirmToken',
      'sendRoleConfirmation',
      'cancelPendingConfirmation',
      'findConfirmationByToken',
    ]);

    emailQueueService = createMock<EmailQueueService>(['sendWelcomeEmail']);

    adminService = createServiceMock<AdminService>([
      'isUserValidAdmin',
      'revokeSiteAdminRole',
    ]);

    storeRoleService = createServiceMock<StoreRoleService>([
      'getUserStoreRoles',
      'findByStoreUser',
      'revokeStoreRole',
    ]);

    jwtService.signAsync!.mockResolvedValue('jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: EmailQueueService, useValue: emailQueueService },
        { provide: AdminService, useValue: adminService },
        { provide: StoreRoleService, useValue: storeRoleService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('doesUserExists', () => {
    it('should return true when user exists', async () => {
      userService.findByEmail!.mockResolvedValue(mockUser as any);

      const result = await service.doesUserExists({
        email: mockUser.email,
      } as any);

      expect(result).toBe(true);
      expect(userService.findByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should return false when user does not exist', async () => {
      userService.findByEmail!.mockResolvedValue(null as unknown as UserDto);

      const result = await service.doesUserExists({
        email: 'nonexistent@example.com',
      } as any);

      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: mockUser.email,
      password: 'password123',
    };

    beforeEach(() => {
      refreshTokenService.create!.mockResolvedValue(undefined as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.findUserWithPassword!.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      await expect(service.login(loginDto)).rejects.toThrow(
        `User with such email doesn't exist`
      );
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      userService.findUserWithPassword!.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid password or email'
      );
    });

    it('should return tokens and user info on successful login', async () => {
      userService.findUserWithPassword!.mockResolvedValue(mockVerifiedUser);
      confirmationService.getPendingConfirmations!.mockResolvedValue({
        accountVerification: false,
        roleAssignments: [],
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('csrfToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.id).toBe(mockUser.id);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should include pending confirmations for unverified users', async () => {
      userService.findUserWithPassword!.mockResolvedValue(mockUser);
      const pendingConfirmations = {
        accountVerification: true,
        roleAssignments: [
          {
            type: ConfirmationType.STORE_ADMIN_ROLE,
            metadata: { storeId: 's1' },
            expiresAt: new Date(),
          },
        ],
      };
      confirmationService.getPendingConfirmations!.mockResolvedValue(
        pendingConfirmations
      );

      const result = await service.login(loginDto);

      expect(result.pendingConfirmations).toEqual(pendingConfirmations);
      expect(confirmationService.getPendingConfirmations).toHaveBeenCalledWith(
        mockUser.id
      );
    });

    it('should not fetch pending confirmations for verified users', async () => {
      userService.findUserWithPassword!.mockResolvedValue(mockVerifiedUser);

      const result = await service.login(loginDto);

      expect(result.pendingConfirmations).toBeNull();
      expect(
        confirmationService.getPendingConfirmations
      ).not.toHaveBeenCalled();
    });

    it('should include request metadata in refresh token', async () => {
      userService.findUserWithPassword!.mockResolvedValue(mockVerifiedUser);
      const req = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-device-id': 'device-123',
        },
      } as any;

      await service.login(loginDto, req);

      expect(refreshTokenService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          deviceId: 'device-123',
        })
      );
    });
  });

  describe('register', () => {
    const registerDto: CreateUserDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    beforeEach(() => {
      confirmationService.sendAccountConfirmation!.mockResolvedValue(undefined);
      emailQueueService.sendWelcomeEmail!.mockResolvedValue(undefined as any);
    });

    it('should throw ConflictException when user already exists', async () => {
      jest.spyOn(service, 'doesUserExists').mockResolvedValue(true);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Such user already exists'
      );
    });

    it('should create user and send confirmation email', async () => {
      jest.spyOn(service, 'doesUserExists').mockResolvedValue(false);
      userService.create!.mockResolvedValue(mockUser as any);
      jest.spyOn(service, 'login').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        csrfToken: 'c',
        user: mockUser,
        pendingConfirmations: null,
      } as any);

      const result = await service.register(registerDto);

      expect(userService.create).toHaveBeenCalledWith(registerDto);
      expect(confirmationService.sendAccountConfirmation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email
      );
      expect(result.message).toContain('check your email');
      expect(result.requiresVerification).toBe(true);
    });

    it('should send welcome email after registration', async () => {
      jest.spyOn(service, 'doesUserExists').mockResolvedValue(false);
      userService.create!.mockResolvedValue(mockUser as any);
      jest.spyOn(service, 'login').mockResolvedValue({} as any);

      await service.register(registerDto);

      expect(emailQueueService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ delay: expect.any(Number) })
      );
    });

    it('should log user in after registration', async () => {
      jest.spyOn(service, 'doesUserExists').mockResolvedValue(false);
      userService.create!.mockResolvedValue(mockUser as any);
      const loginSpy = jest.spyOn(service, 'login').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        csrfToken: 'c',
        user: mockUser,
        pendingConfirmations: null,
      } as any);

      await service.register(registerDto);

      expect(loginSpy).toHaveBeenCalledWith(
        { email: registerDto.email, password: registerDto.password },
        undefined
      );
    });
  });

  describe('getConfirmationStatus', () => {
    it('should return comprehensive confirmation status', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      const pendingConfirmations = {
        accountVerification: true,
        roleAssignments: [
          {
            type: ConfirmationType.STORE_ADMIN_ROLE,
            metadata: { storeId: 's1' },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
          },
        ],
      };
      confirmationService.getPendingConfirmations!.mockResolvedValue(
        pendingConfirmations
      );
      adminService.isUserValidAdmin!.mockResolvedValue(false);
      storeRoleService.getUserStoreRoles!.mockResolvedValue([]);

      const result = await service.getConfirmationStatus(mockUser.id);

      expect(result.user.id).toBe(mockUser.id);
      expect(result.pendingConfirmations.accountVerification).toBe(true);
      expect(result.pendingConfirmations.roleAssignments[0]).toHaveProperty(
        'timeRemaining'
      );
      expect(result.activeRoles).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.getEntityById!.mockResolvedValue(null);

      await expect(
        service.getConfirmationStatus('nonexistent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should include active store roles', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      confirmationService.getPendingConfirmations!.mockResolvedValue({
        accountVerification: false,
        roleAssignments: [],
      });
      adminService.isUserValidAdmin!.mockResolvedValue(false);
      storeRoleService.getUserStoreRoles!.mockResolvedValue([
        {
          store: { id: 's1', name: 'Test Store' },
          roleName: StoreRoles.ADMIN,
          assignedAt: new Date(),
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.getConfirmationStatus(mockUser.id);

      expect(result.activeRoles.storeRoles).toHaveLength(1);
      expect(result.activeRoles.storeRoles[0].storeId).toBe('s1');
      expect(result.activeRoles.storeRoles[0].role).toBe(StoreRoles.ADMIN);
    });

    it('should indicate site admin status', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      confirmationService.getPendingConfirmations!.mockResolvedValue({
        accountVerification: false,
        roleAssignments: [],
      });
      adminService.isUserValidAdmin!.mockResolvedValue(true);
      storeRoleService.getUserStoreRoles!.mockResolvedValue([]);

      const result = await service.getConfirmationStatus(mockUser.id);

      expect(result.activeRoles.siteAdmin).toBe(true);
    });
  });

  describe('confirmEmail', () => {
    it('should confirm email successfully', async () => {
      const token = 'confirmation-token';
      confirmationService.confirmToken!.mockResolvedValue({
        success: true,
        message: 'Email confirmed',
        userId: mockUser.id,
        type: ConfirmationType.ACCOUNT_VERIFICATION,
      });
      userService.getEntityById!.mockResolvedValue(mockVerifiedUser);

      const result = await service.confirmEmail(token);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.isEmailVerified).toBe(true);
      expect(confirmationService.confirmToken).toHaveBeenCalledWith(token);
    });

    it('should return failure when confirmation fails', async () => {
      confirmationService.confirmToken!.mockResolvedValue({
        success: false,
        message: 'Invalid token',
        userId: '',
        type: ConfirmationType.ACCOUNT_VERIFICATION,
      });

      const result = await service.confirmEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email confirmation failed');
    });
  });

  describe('confirmRole', () => {
    it('should confirm role assignment successfully', async () => {
      const token = 'role-token';
      confirmationService.confirmToken!.mockResolvedValue({
        success: true,
        message: 'Role assigned',
        userId: mockUser.id,
        type: ConfirmationType.STORE_ADMIN_ROLE,
      });
      userService.getEntityById!.mockResolvedValue(mockUser);
      adminService.isUserValidAdmin!.mockResolvedValue(false);
      storeRoleService.getUserStoreRoles!.mockResolvedValue([
        {
          store: { id: 's1', name: 'Test Store' },
          roleName: StoreRoles.ADMIN,
          assignedAt: new Date(),
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.confirmRole(token);

      expect(result.success).toBe(true);
      expect(result.roleType).toBe(ConfirmationType.STORE_ADMIN_ROLE);
      expect(result.user?.activeRoles).toBeDefined();
    });

    it('should return failure when role confirmation fails', async () => {
      confirmationService.confirmToken!.mockResolvedValue({
        success: false,
        message: 'Invalid token',
        userId: '',
        type: ConfirmationType.STORE_ADMIN_ROLE,
      });

      const result = await service.confirmRole('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Role confirmation failed');
    });
  });

  describe('resendConfirmation', () => {
    it('should resend confirmation email', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      confirmationService.sendAccountConfirmation!.mockResolvedValue(undefined);

      await service.resendConfirmation(mockUser.id);

      expect(confirmationService.sendAccountConfirmation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userService.getEntityById!.mockResolvedValue(null);

      await expect(service.resendConfirmation('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when email already verified', async () => {
      userService.getEntityById!.mockResolvedValue(mockVerifiedUser);

      await expect(service.resendConfirmation(mockUser.id)).rejects.toThrow(
        ConflictException
      );
      await expect(service.resendConfirmation(mockUser.id)).rejects.toThrow(
        'Email is already verified'
      );
    });
  });

  describe('cancelRoleAssignment', () => {
    it('should allow user to cancel their own role assignment', async () => {
      adminService.isUserValidAdmin!.mockResolvedValue(false);
      confirmationService.cancelPendingConfirmation!.mockResolvedValue(
        undefined
      );

      await service.cancelRoleAssignment(
        'u1',
        ConfirmationType.STORE_ADMIN_ROLE,
        'u1'
      );

      expect(
        confirmationService.cancelPendingConfirmation
      ).toHaveBeenCalledWith('u1', ConfirmationType.STORE_ADMIN_ROLE);
    });

    it('should allow admin to cancel any role assignment', async () => {
      adminService.isUserValidAdmin!.mockResolvedValue(true);
      confirmationService.cancelPendingConfirmation!.mockResolvedValue(
        undefined
      );

      await service.cancelRoleAssignment(
        'u2',
        ConfirmationType.STORE_ADMIN_ROLE,
        'admin1'
      );

      expect(confirmationService.cancelPendingConfirmation).toHaveBeenCalled();
    });

    it('should throw BadRequestException when non-admin tries to cancel another user', async () => {
      adminService.isUserValidAdmin!.mockResolvedValue(false);

      await expect(
        service.cancelRoleAssignment(
          'u2',
          ConfirmationType.STORE_ADMIN_ROLE,
          'u1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignSiteAdminRole', () => {
    it('should send site admin role confirmation', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      adminService.isUserValidAdmin!.mockResolvedValue(false);
      confirmationService.sendRoleConfirmation!.mockResolvedValue(undefined);

      await service.assignSiteAdminRole('u1', 'admin1');

      expect(confirmationService.sendRoleConfirmation).toHaveBeenCalledWith(
        'u1',
        mockUser.email,
        AdminRoles.ADMIN,
        expect.objectContaining({
          assignedBy: 'admin1',
        })
      );
    });

    it('should throw NotFoundException when target user not found', async () => {
      userService.getEntityById!.mockResolvedValue(null);

      await expect(
        service.assignSiteAdminRole('nonexistent', 'admin1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already admin', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      adminService.isUserValidAdmin!.mockResolvedValue(true);

      await expect(service.assignSiteAdminRole('u1', 'admin1')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('assignStoreRole', () => {
    it('should send store role confirmation', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      storeRoleService.findByStoreUser!.mockResolvedValue(null);
      confirmationService.sendRoleConfirmation!.mockResolvedValue(undefined);

      await service.assignStoreRole('u1', 's1', StoreRoles.ADMIN, 'admin1');

      expect(confirmationService.sendRoleConfirmation).toHaveBeenCalledWith(
        'u1',
        mockUser.email,
        StoreRoles.ADMIN,
        expect.objectContaining({
          storeId: 's1',
          role: StoreRoles.ADMIN,
          assignedBy: 'admin1',
        })
      );
    });

    it('should throw NotFoundException when target user not found', async () => {
      userService.getEntityById!.mockResolvedValue(null);

      await expect(
        service.assignStoreRole('nonexistent', 's1', StoreRoles.ADMIN, 'admin1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user already has active role', async () => {
      userService.getEntityById!.mockResolvedValue(mockUser);
      storeRoleService.findByStoreUser!.mockResolvedValue({
        isActive: true,
        roleName: StoreRoles.MODERATOR,
      } as any);

      await expect(
        service.assignStoreRole('u1', 's1', StoreRoles.ADMIN, 'admin1')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeSiteAdminRole', () => {
    it('should delegate to adminService', async () => {
      adminService.revokeSiteAdminRole!.mockResolvedValue(undefined);

      await service.revokeSiteAdminRole('u1', 'admin1');

      expect(adminService.revokeSiteAdminRole).toHaveBeenCalledWith(
        'u1',
        'admin1'
      );
    });
  });

  describe('revokeStoreRole', () => {
    it('should delegate to storeRoleService', async () => {
      storeRoleService.revokeStoreRole!.mockResolvedValue(undefined);

      await service.revokeStoreRole('u1', 's1', 'admin1');

      expect(storeRoleService.revokeStoreRole).toHaveBeenCalledWith(
        'u1',
        's1',
        'admin1'
      );
    });
  });

  describe('refreshAccessToken', () => {
    const payload = { id: 'u1', email: 'user@example.com', sub: 'u1' };
    const token = 'refresh-token';

    it('should throw UnauthorizedException when token not found', async () => {
      refreshTokenService.findByToken!.mockResolvedValue(null);

      await expect(service.refreshAccessToken(payload, token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when token is banned', async () => {
      refreshTokenService.findByToken!.mockResolvedValue({
        user: mockUser,
        isBanned: true,
      } as any);

      await expect(service.refreshAccessToken(payload, token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when user id mismatch', async () => {
      refreshTokenService.findByToken!.mockResolvedValue({
        user: { id: 'u2' },
        isBanned: false,
      } as any);

      await expect(service.refreshAccessToken(payload, token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should rotate tokens successfully', async () => {
      refreshTokenService.findByToken!.mockResolvedValue({
        user: mockUser,
        isBanned: false,
      } as any);
      refreshTokenService.removeByValue!.mockResolvedValue(undefined);
      refreshTokenService.create!.mockResolvedValue(undefined as any);

      const result = await service.refreshAccessToken(payload, token);

      expect(refreshTokenService.removeByValue).toHaveBeenCalledWith(token);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('csrfToken');
    });
  });

  describe('banRefresh', () => {
    it('should toggle ban on refresh token', async () => {
      refreshTokenService.toggleBan!.mockResolvedValue({} as any);

      await service.banRefresh('token');

      expect(refreshTokenService.toggleBan).toHaveBeenCalledWith('token');
    });
  });

  describe('processConfirmation', () => {
    it('should process account verification', async () => {
      confirmationService.confirmToken!.mockResolvedValue({
        success: true,
        message: 'Email verified',
        userId: 'u1',
        type: ConfirmationType.ACCOUNT_VERIFICATION,
      });
      userService.getEntityById!.mockResolvedValue(mockVerifiedUser);

      const result = await service.processConfirmation(
        'account-verification',
        'token'
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe(ConfirmationType.ACCOUNT_VERIFICATION);
    });

    it('should throw BadRequestException for invalid type', async () => {
      await expect(
        service.processConfirmation('invalid-type', 'token')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for type mismatch', async () => {
      confirmationService.confirmToken!.mockResolvedValue({
        success: true,
        message: 'Done',
        userId: 'u1',
        type: ConfirmationType.SITE_ADMIN_ROLE,
      });

      await expect(
        service.processConfirmation('account-verification', 'token')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeConfirmation', () => {
    it('should revoke confirmation successfully', async () => {
      confirmationService.findConfirmationByToken!.mockResolvedValue({
        userId: 'u1',
        isUsed: false,
      } as any);
      confirmationService.cancelPendingConfirmation!.mockResolvedValue(
        undefined
      );

      const result = await service.revokeConfirmation(
        'account-verification',
        'token'
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe(ConfirmationType.ACCOUNT_VERIFICATION);
    });

    it('should throw NotFoundException when confirmation not found', async () => {
      confirmationService.findConfirmationByToken!.mockResolvedValue(null);

      await expect(
        service.revokeConfirmation('account-verification', 'token')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already processed', async () => {
      confirmationService.findConfirmationByToken!.mockResolvedValue({
        userId: 'u1',
        isUsed: true,
      } as any);

      await expect(
        service.revokeConfirmation('account-verification', 'token')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
