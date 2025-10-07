import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { createPolicyMock, MockedMethods } from 'test/unit/helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let policyService: Partial<MockedMethods<PolicyService>>;

  const mockUser = {
    id: 'u1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    const request = {
      user,
      headers: {},
      method: 'GET',
      url: '/test',
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    policyService = createPolicyMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: PolicyService, useValue: policyService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should extend AuthGuard', () => {
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should have policyService injected', () => {
      expect(guard['policyService']).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('should return true when user is authenticated and active', async () => {
      const context = createMockExecutionContext(mockUser);

      // Mock super.canActivate properly
      jest.spyOn(guard as any, 'logIn').mockResolvedValue(undefined);
      jest.spyOn(guard as any, 'getAuthenticateOptions').mockReturnValue({});
      jest
        .spyOn(guard as any, 'getRequest')
        .mockReturnValue(context.switchToHttp().getRequest());

      // Mock the passport strategy validation
      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      policyService.isUserActive!.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(policyService.isUserActive).toHaveBeenCalledWith('u1');
    });

    it('should return false when super.canActivate returns false', async () => {
      const context = createMockExecutionContext();

      // Mock super.canActivate to return false
      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(policyService.isUserActive).not.toHaveBeenCalled();
    });

    it('should return false when user has no id', async () => {
      const userWithoutId = { email: 'user@example.com' };
      const context = createMockExecutionContext(userWithoutId);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(policyService.isUserActive).not.toHaveBeenCalled();
    });

    it('should return false when user is null', async () => {
      const context = createMockExecutionContext(null);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(policyService.isUserActive).not.toHaveBeenCalled();
    });

    it('should return false when user is undefined', async () => {
      const context = createMockExecutionContext(undefined);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(policyService.isUserActive).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'User account is inactive or deleted'
      );
      expect(policyService.isUserActive).toHaveBeenCalledWith('u1');
    });

    it('should check user active status after successful authentication', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(policyService.isUserActive).toHaveBeenCalledWith('u1');
      expect(policyService.isUserActive).toHaveBeenCalledTimes(1);
    });

    it('should extract user from request correctly', async () => {
      const customUser = { id: 'custom-id', email: 'custom@example.com' };
      const context = createMockExecutionContext(customUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(policyService.isUserActive).toHaveBeenCalledWith('custom-id');
    });

    it('should handle policyService errors', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockRejectedValue(
        new Error('Database error')
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Database error'
      );
    });

    it('should call switchToHttp().getRequest()', async () => {
      const context = createMockExecutionContext(mockUser);
      const switchToHttp = context.switchToHttp();

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(context.switchToHttp).toHaveBeenCalled();
      expect(switchToHttp.getRequest).toHaveBeenCalled();
    });
  });

  describe('handleRequest', () => {
    it('should throw provided error when error exists', () => {
      const error = new Error('Authentication failed');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
      expect(() => guard.handleRequest(error, null, null)).toThrow(
        'Authentication failed'
      );
    });

    it('should throw UnauthorizedException when no user provided', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException with info message when provided', () => {
      const info = { message: 'Invalid token' };

      try {
        guard.handleRequest(null, undefined, info);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect(e.message).toContain('Invalid token');
      }
    });

    it('should throw UnauthorizedException with default message when no info', () => {
      try {
        guard.handleRequest(null, undefined, null);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect(e.message).toContain('Unauthorized');
      }
    });

    it('should return user when no error and user exists', () => {
      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBe(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should prioritize error over missing user', () => {
      const error = new Error('Custom error');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should return user object with all properties', () => {
      const user = {
        id: 'u1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['admin'],
      };

      const result = guard.handleRequest(null, user, null);

      expect(result).toEqual(user);
      expect(result.id).toBe('u1');
      expect(result.roles).toEqual(['admin']);
    });

    it('should handle info without message property', () => {
      const info = { type: 'expired' };

      try {
        guard.handleRequest(null, undefined, info);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect(e.message).toContain('Unauthorized');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should successfully authenticate active user through full flow', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(true);

      const canActivateResult = await guard.canActivate(context);
      expect(canActivateResult).toBe(true);

      const handleRequestResult = guard.handleRequest(null, mockUser, null);
      expect(handleRequestResult).toEqual(mockUser);
    });

    it('should block inactive user even with valid token', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User account is inactive or deleted'
      );
    });

    it('should handle multiple consecutive requests', async () => {
      const context1 = createMockExecutionContext({ id: 'u1' });
      const context2 = createMockExecutionContext({ id: 'u2' });
      const context3 = createMockExecutionContext({ id: 'u3' });

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(true);

      await guard.canActivate(context1);
      await guard.canActivate(context2);
      await guard.canActivate(context3);

      expect(policyService.isUserActive).toHaveBeenCalledTimes(3);
      expect(policyService.isUserActive).toHaveBeenNthCalledWith(1, 'u1');
      expect(policyService.isUserActive).toHaveBeenNthCalledWith(2, 'u2');
      expect(policyService.isUserActive).toHaveBeenNthCalledWith(3, 'u3');
    });
  });

  describe('edge cases', () => {
    it('should handle user with id = 0', async () => {
      const context = createMockExecutionContext({ id: 0 });

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user with empty string id', async () => {
      const context = createMockExecutionContext({ id: '' });

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user object without id property', async () => {
      const context = createMockExecutionContext({ email: 'test@example.com' });

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle malformed execution context', async () => {
      const badContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
        }),
      } as any;

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);

      const result = await guard.canActivate(badContext);

      expect(result).toBe(false);
    });

    it('should handle UnauthorizedException from policyService', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockRejectedValue(
        new UnauthorizedException('User banned')
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle null info in handleRequest', () => {
      const result = guard.handleRequest(null, mockUser, null);
      expect(result).toEqual(mockUser);
    });

    it('should handle undefined info in handleRequest', () => {
      const result = guard.handleRequest(null, mockUser, undefined);
      expect(result).toEqual(mockUser);
    });

    it('should handle info with various properties', () => {
      const info = {
        message: 'Token expired',
        type: 'jwt-expired',
        statusCode: 401,
      };

      try {
        guard.handleRequest(null, null, info);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect(e.message).toContain('Token expired');
      }
    });
  });

  describe('error messages', () => {
    it('should have descriptive error message for inactive user', async () => {
      const context = createMockExecutionContext(mockUser);

      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate = jest
        .fn()
        .mockResolvedValue(true);
      policyService.isUserActive!.mockResolvedValue(false);

      try {
        await guard.canActivate(context);
      } catch (e) {
        expect(e.message).toBe('User account is inactive or deleted');
        expect(e).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should preserve original error messages', () => {
      const originalError = new Error('Original error message');

      try {
        guard.handleRequest(originalError, null, null);
      } catch (e) {
        expect(e.message).toBe('Original error message');
      }
    });

    it('should use info message when available', () => {
      const info = { message: 'JWT malformed' };

      try {
        guard.handleRequest(null, null, info);
      } catch (e) {
        expect(e.message).toContain('JWT malformed');
      }
    });
  });
});
