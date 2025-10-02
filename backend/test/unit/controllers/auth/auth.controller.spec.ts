import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { Request, Response } from 'express';
import { createMock, MockedMethods } from '../../utils/helpers';
import { BadRequestException } from '@nestjs/common';
import { ConfirmationType } from 'src/modules/auth/confirmation/enums/confirmation.enum';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<MockedMethods<AuthService>>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    csrfToken: 'csrf-token',
    user: {
      id: 'u1',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const createMockResponse = (): Partial<Response> => {
    const res: any = {
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const createMockRequest = (
    overrides?: Partial<Request>
  ): Partial<Request> => ({
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-device-id': 'device-123',
    },
    cookies: {
      refreshToken: 'refresh-token',
      'XSRF-TOKEN': 'csrf-token',
    },
    user: {
      id: 'u1',
      email: 'user@example.com',
    } as any,
    ...overrides,
  });

  beforeEach(async () => {
    authService = createMock<AuthService>([
      'register',
      'login',
      'refreshAccessToken',
      'banRefresh',
      'processConfirmation',
      'revokeConfirmation',
      'resendConfirmation',
      'getConfirmationStatus',
      'assignSiteAdminRole',
      'assignStoreRole',
      'cancelRoleAssignment',
      'revokeSiteAdminRole',
      'revokeStoreRole',
    ]);

    mockRequest = createMockRequest();
    mockResponse = createMockResponse();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('register - POST /auth/register', () => {
    it('should register user and set cookies', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
      };

      authService.register!.mockResolvedValue({
        ...mockTokens,
        message: 'Registration successful',
        requiresVerification: true,
      } as any);

      await controller.register(
        registerDto as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        mockRequest
      );
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        accessToken: mockTokens.accessToken,
        user: mockTokens.user,
        message: 'Registration successful',
        requiresVerification: true,
      });
    });

    it('should set refresh token cookie with correct options', async () => {
      authService.register!.mockResolvedValue(mockTokens as any);

      await controller.register(
        {} as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/auth/refresh',
        })
      );
    });

    it('should set CSRF token cookie', async () => {
      authService.register!.mockResolvedValue(mockTokens as any);

      await controller.register(
        {} as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        mockTokens.csrfToken,
        expect.objectContaining({
          httpOnly: false,
          secure: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });
  });

  describe('login - POST /auth/login', () => {
    it('should login user and set cookies', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'password123',
      };

      authService.login!.mockResolvedValue({
        ...mockTokens,
        pendingConfirmations: null,
      } as any);

      await controller.login(
        loginDto as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(authService.login).toHaveBeenCalledWith(loginDto, mockRequest);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        accessToken: mockTokens.accessToken,
        user: mockTokens.user,
        pendingConfirmations: null,
      });
    });

    it('should include pending confirmations', async () => {
      const pendingConfirmations = {
        accountVerification: true,
        roleAssignments: [],
      };

      authService.login!.mockResolvedValue({
        ...mockTokens,
        pendingConfirmations,
      } as any);

      await controller.login(
        {} as any,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingConfirmations,
        })
      );
    });
  });

  describe('refresh - POST /auth/refresh', () => {
    beforeEach(() => {
      mockRequest.headers = {
        'x-csrf-token': 'csrf-token',
      };
      mockRequest.cookies = {
        'XSRF-TOKEN': 'csrf-token',
        refreshToken: 'refresh-token',
      };
    });

    it('should refresh tokens successfully', async () => {
      authService.refreshAccessToken!.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        csrfToken: 'new-csrf-token',
      });

      await controller.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(authService.refreshAccessToken).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        accessToken: 'new-access-token',
      });
    });

    it('should reject request with invalid CSRF token', async () => {
      mockRequest.headers = { 'x-csrf-token': 'wrong-token' };

      await controller.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid CSRF token',
      });
      expect(authService.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should reject request with missing CSRF token', async () => {
      mockRequest.headers = {};

      await controller.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should accept X-XSRF-TOKEN header', async () => {
      mockRequest.headers = { 'x-xsrf-token': 'csrf-token' };
      authService.refreshAccessToken!.mockResolvedValue(mockTokens);

      await controller.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(authService.refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe('logout - POST /auth/logout', () => {
    it('should logout and clear cookies', async () => {
      authService.banRefresh!.mockResolvedValue(undefined as any);

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        { refreshToken: 'refresh-token' } as any
      );

      expect(authService.banRefresh).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should extract token from cookies', async () => {
      authService.banRefresh!.mockResolvedValue(undefined as any);

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        {} as any
      );

      expect(authService.banRefresh).toHaveBeenCalledWith('refresh-token');
    });

    it('should handle logout without token', async () => {
      mockRequest.cookies = {};

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        {} as any
      );

      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('confirmFromLink - GET /auth/confirm/:type', () => {
    it('should confirm account verification', async () => {
      const mockResult = {
        success: true,
        message: 'Email verified',
        type: ConfirmationType.ACCOUNT_VERIFICATION,
        user: mockTokens.user,
      };

      authService.processConfirmation!.mockResolvedValue(mockResult as any);

      const result = await controller.confirmFromLink(
        'account-verification',
        'token-123'
      );

      expect(authService.processConfirmation).toHaveBeenCalledWith(
        'account-verification',
        'token-123'
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when token missing', async () => {
      await expect(
        controller.confirmFromLink('account-verification', '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle role confirmations', async () => {
      const mockResult = {
        success: true,
        message: 'Role assigned',
        type: ConfirmationType.STORE_ADMIN_ROLE,
        user: mockTokens.user,
        activeRoles: {
          siteAdmin: false,
          storeRoles: [{ storeId: 's1', role: StoreRoles.ADMIN }],
        },
      };

      authService.processConfirmation!.mockResolvedValue(mockResult as any);

      const result = await controller.confirmFromLink(
        'store-admin-role',
        'token-123'
      );

      expect(result.activeRoles).toBeDefined();
    });
  });

  describe('confirmFromApi - POST /auth/confirm/:type', () => {
    it('should confirm via API call', async () => {
      const mockResult = {
        success: true,
        message: 'Email verified',
        type: ConfirmationType.ACCOUNT_VERIFICATION,
        user: mockTokens.user,
      };

      authService.processConfirmation!.mockResolvedValue(mockResult as any);

      const result = await controller.confirmFromApi('account-verification', {
        token: 'token-123',
      });

      expect(authService.processConfirmation).toHaveBeenCalledWith(
        'account-verification',
        'token-123'
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('revokeConfirmationFromLink - DELETE /auth/confirm/:type', () => {
    it('should revoke confirmation', async () => {
      const mockResult = {
        success: true,
        message: 'Confirmation cancelled',
        type: ConfirmationType.ACCOUNT_VERIFICATION,
      };

      authService.revokeConfirmation!.mockResolvedValue(mockResult);

      const result = await controller.revokeConfirmationFromLink(
        'account-verification',
        'token-123'
      );

      expect(authService.revokeConfirmation).toHaveBeenCalledWith(
        'account-verification',
        'token-123'
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when token missing', async () => {
      await expect(
        controller.revokeConfirmationFromLink('account-verification', '')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendConfirmation - POST /auth/resend-confirmation', () => {
    it('should resend confirmation email', async () => {
      authService.resendConfirmation!.mockResolvedValue(undefined);

      const result = await controller.resendConfirmation(
        { userId: 'u1' },
        mockRequest as Request
      );

      expect(authService.resendConfirmation).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        success: true,
        message: 'Confirmation email sent successfully',
      });
    });

    it('should use authenticated user id when not provided', async () => {
      authService.resendConfirmation!.mockResolvedValue(undefined);

      await controller.resendConfirmation({}, mockRequest as Request);

      expect(authService.resendConfirmation).toHaveBeenCalledWith('u1');
    });

    it('should throw BadRequestException when no user id available', async () => {
      mockRequest.user = undefined;

      await expect(
        controller.resendConfirmation({}, mockRequest as Request)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConfirmationStatus - GET /auth/:userId/confirmation-status', () => {
    it('should return confirmation status', async () => {
      const mockStatus = {
        user: mockTokens.user,
        pendingConfirmations: {
          accountVerification: true,
          roleAssignments: [],
        },
        activeRoles: {
          siteAdmin: false,
          storeRoles: [],
        },
      };

      authService.getConfirmationStatus!.mockResolvedValue(mockStatus as any);

      const result = await controller.getConfirmationStatus('u1');

      expect(authService.getConfirmationStatus).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        success: true,
        data: mockStatus,
      });
    });
  });

  describe('assignSiteAdmin - POST /auth/assign-site-admin', () => {
    it('should assign site admin role', async () => {
      authService.assignSiteAdminRole!.mockResolvedValue(undefined);

      const result = await controller.assignSiteAdmin(
        { userId: 'u2' },
        mockRequest as Request
      );

      expect(authService.assignSiteAdminRole).toHaveBeenCalledWith('u2', 'u1');
      expect(result).toEqual({
        success: true,
        message: 'Site admin role assignment email sent',
      });
    });
  });

  describe('assignStoreRole - POST /auth/assign-store-role', () => {
    it('should assign store role', async () => {
      authService.assignStoreRole!.mockResolvedValue(undefined);

      const result = await controller.assignStoreRole(
        {
          userId: 'u2',
          storeId: 's1',
          role: StoreRoles.ADMIN,
        },
        mockRequest as Request
      );

      expect(authService.assignStoreRole).toHaveBeenCalledWith(
        'u2',
        's1',
        StoreRoles.ADMIN,
        'u1'
      );
      expect(result).toEqual({
        success: true,
        message: `Store ${StoreRoles.ADMIN} role assignment email sent`,
      });
    });

    it('should throw BadRequestException when storeId missing', async () => {
      await expect(
        controller.assignStoreRole(
          { userId: 'u2', role: StoreRoles.ADMIN } as any,
          mockRequest as Request
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when role missing', async () => {
      await expect(
        controller.assignStoreRole(
          { userId: 'u2', storeId: 's1' } as any,
          mockRequest as Request
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelRoleAssignment - DELETE /auth/cancel-role-assignment', () => {
    it('should cancel role assignment', async () => {
      authService.cancelRoleAssignment!.mockResolvedValue(undefined);

      const result = await controller.cancelRoleAssignment(
        {
          userId: 'u2',
          confirmationType: ConfirmationType.STORE_ADMIN_ROLE,
        },
        mockRequest as Request
      );

      expect(authService.cancelRoleAssignment).toHaveBeenCalledWith(
        'u2',
        ConfirmationType.STORE_ADMIN_ROLE,
        'u1'
      );
      expect(result).toEqual({
        success: true,
        message: 'Role assignment cancelled successfully',
      });
    });

    it('should use authenticated user id when userId not provided', async () => {
      authService.cancelRoleAssignment!.mockResolvedValue(undefined);

      await controller.cancelRoleAssignment(
        { confirmationType: ConfirmationType.STORE_ADMIN_ROLE } as any,
        mockRequest as Request
      );

      expect(authService.cancelRoleAssignment).toHaveBeenCalledWith(
        'u1',
        ConfirmationType.STORE_ADMIN_ROLE,
        'u1'
      );
    });

    it('should throw BadRequestException when no user id available', async () => {
      mockRequest.user = undefined;

      await expect(
        controller.cancelRoleAssignment(
          { confirmationType: ConfirmationType.STORE_ADMIN_ROLE } as any,
          mockRequest as Request
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeSiteAdmin - POST /auth/revoke-site-admin', () => {
    it('should revoke site admin role', async () => {
      authService.revokeSiteAdminRole!.mockResolvedValue(undefined);

      const result = await controller.revokeSiteAdmin(
        { userId: 'u2' },
        mockRequest as Request
      );

      expect(authService.revokeSiteAdminRole).toHaveBeenCalledWith('u2', 'u1');
      expect(result).toEqual({
        success: true,
        message: 'Site admin role revoked successfully',
      });
    });
  });

  describe('revokeStoreRole - POST /auth/revoke-store-role', () => {
    it('should revoke store role', async () => {
      authService.revokeStoreRole!.mockResolvedValue(undefined);

      const result = await controller.revokeStoreRole(
        { userId: 'u2', storeId: 's1' },
        mockRequest as Request
      );

      expect(authService.revokeStoreRole).toHaveBeenCalledWith(
        'u2',
        's1',
        'u1'
      );
      expect(result).toEqual({
        success: true,
        message: 'Store role revoked successfully',
      });
    });

    it('should throw BadRequestException when storeId missing', async () => {
      await expect(
        controller.revokeStoreRole(
          { userId: 'u2' } as any,
          mockRequest as Request
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle service errors gracefully', async () => {
      authService.login!.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.login(
          {} as any,
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow('Service error');
    });

    it('should handle missing cookies', async () => {
      mockRequest.cookies = undefined;

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        {} as any
      );

      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });

    it('should extract refresh token from multiple sources', async () => {
      // Test from header
      mockRequest.cookies = {};
      mockRequest.headers = { 'x-refresh-token': 'header-token' };
      authService.banRefresh!.mockResolvedValue(undefined as any);

      await controller.logout(
        mockRequest as Request,
        mockResponse as Response,
        {} as any
      );

      expect(authService.banRefresh).toHaveBeenCalled();
    });
  });

  describe('guards', () => {
    it('should have JwtAuthGuard on protected routes', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.resendConfirmation
      );
      expect(guards).toBeDefined();
    });

    it('should have AdminGuard on admin routes', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.assignSiteAdmin
      );
      expect(guards).toBeDefined();
    });
  });
});
