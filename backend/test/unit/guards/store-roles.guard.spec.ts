import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import {
  createMockExecutionContext,
  createPolicyMock,
  MockedMethods,
} from '../utils/helpers';
import { jest } from '@jest/globals';
import { StoreRoles } from 'src/common/enums/store-roles.enum';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';

describe('StoreRolesGuard', () => {
  let guard: StoreRolesGuard;
  let reflector: Reflector;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  beforeEach(() => {
    policyMock = createPolicyMock();
    reflector = new Reflector();
    guard = new StoreRolesGuard(
      reflector,
      policyMock as unknown as PolicyService
    );
    jest.clearAllMocks();
  });

  it('short-circuits when request.user.isSiteAdmin === true', async () => {
    const ctx = createMockExecutionContext({
      user: { id: 'admin', isSiteAdmin: true },
      params: {},
    });

    // even if reflector would return a required role, admin flag should bypass checks
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([StoreRoles.ADMIN]);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    // policyService should not be called because short-circuit happened
    expect(policyMock.checkPolicy).not.toHaveBeenCalled();
    expect(policyMock.isSiteAdmin).not.toHaveBeenCalled();
  });

  it('computes isSiteAdmin when missing and caches result (allow on admin)', async () => {
    // user without isSiteAdmin flag
    const ctx = createMockExecutionContext({
      user: { id: 'u1' }, // no isSiteAdmin flag
      params: {},
    });

    // reflector returns no role requirement (so function normally allows)
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as any);

    // simulate policySvc.isSiteAdmin returning true -> should short-circuit and allow
    policyMock.isSiteAdmin!.mockResolvedValue(true);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(policyMock.isSiteAdmin).toHaveBeenCalledWith({ id: 'u1' });

    // verify cached flag written to request.user
    const req = ctx.switchToHttp().getRequest();
    expect(req.user.isSiteAdmin).toBe(true);
  });

  it('honors static accessPolicies when reflector returns no metadata', async () => {
    // Build an ExecutionContext with handler named 'myHandler' and class containing accessPolicies
    const handlerFn = function myHandler() {};
    const staticAccessPolicies = {
      myHandler: {
        storeRoles: [StoreRoles.ADMIN],
        requireAuthenticated: true,
      },
    };

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'u1' }, params: { storeId: 's1' } }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => handlerFn,
      getClass: () => ({ accessPolicies: staticAccessPolicies }),
    };

    // make reflector return undefined (no explicit decorator metadata)
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as StoreRoles[]);

    // simulate policyService.checkPolicy allowing access
    policyMock.checkPolicy!.mockResolvedValue(true);

    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext)
    ).resolves.toBe(true);

    // check that we used checkPolicy with constructed policy entry
    expect(policyMock.checkPolicy).toHaveBeenCalledWith(
      ctx.switchToHttp().getRequest().user,
      {
        storeRoles: [StoreRoles.ADMIN],
        requireAuthenticated: true,
      },
      ctx.switchToHttp().getRequest().params
    );
  });

  it(`throws ForbiddenException when static accessPolicies require auth and checkPolicy denies`, async () => {
    const handlerFn = function myHandler() {};
    const staticAccessPolicies = {
      myHandler: {
        requireAuthenticated: true,
      },
    };

    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null, params: {} }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => handlerFn,
      getClass: () => ({ accessPolicies: staticAccessPolicies }),
    };

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as StoreRoles[]);

    // simulate checkPolicy returning false (not authenticated)
    policyMock.checkPolicy!.mockResolvedValue(false);

    await expect(guard.canActivate(ctx as any)).rejects.toThrow(
      ForbiddenException
    );
    expect(policyMock.checkPolicy).toHaveBeenCalled();
  });

  it('reads required roles from metadata and allows when checkPolicy returns true', async () => {
    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: { storeId: 's1' },
    });

    // metadata directly on method/class:
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([StoreRoles.ADMIN] as any);

    policyMock.checkPolicy!.mockResolvedValue(true);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(policyMock.checkPolicy).toHaveBeenCalledWith(
      ctx.switchToHttp().getRequest().user,
      {
        storeRoles: [StoreRoles.ADMIN],
        requireAuthenticated: undefined,
      },
      ctx.switchToHttp().getRequest().params
    );
  });

  it('throws ForbiddenException when checkPolicy denies for required roles', async () => {
    const ctx = createMockExecutionContext({
      user: { id: 'u2' },
      params: { storeId: 's1' },
    });

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([StoreRoles.ADMIN] as any);

    policyMock.checkPolicy!.mockResolvedValue(false);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(policyMock.checkPolicy).toHaveBeenCalled();
  });

  it('allows when no role metadata and no requireAuthenticated set', async () => {
    const ctx = createMockExecutionContext({
      user: null,
      params: {},
    });

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as StoreRoles[]);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
