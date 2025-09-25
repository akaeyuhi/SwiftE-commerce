import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from 'src/modules/auth/policy/guards/admin.guard';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  createMockExecutionContext,
  createPolicyMock,
  MockedMethods,
} from '../utils/helpers';
import { jest } from '@jest/globals';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: Reflector;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  beforeEach(async () => {
    policyMock = createPolicyMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        { provide: PolicyService, useValue: policyMock },
        Reflector,
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  it('allows when no policy metadata set', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as string | undefined);

    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(policyMock.checkPolicy).not.toHaveBeenCalled();
  });

  it('calls policyService.checkPolicy when admin meta present and allows', async () => {
    // simulate metadata from decorator (ADMIN_ROLE_META -> string)
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('admin');

    policyMock.checkPolicy!.mockResolvedValue(true as never);

    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: {},
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    // policyService.checkPolicy should be called with the user, policy object and params
    expect(policyMock.checkPolicy).toHaveBeenCalledWith(
      ctx.switchToHttp().getRequest().user,
      { adminRole: 'admin' },
      {}
    );
  });

  it('throws ForbiddenException when policyService denies access', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('admin');

    policyMock.checkPolicy!.mockResolvedValue(false as never);

    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(policyMock.checkPolicy).toHaveBeenCalled();
  });
});
