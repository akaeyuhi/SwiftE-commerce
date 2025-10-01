import { Reflector, ModuleRef } from '@nestjs/core';
import {
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import {
  createMock,
  createMockExecutionContext,
  createPolicyMock,
  MockedMethods,
} from '../utils/helpers';
import { jest } from '@jest/globals';
import { EntityOwnerGuard } from 'src/modules/authorization/guards/entity-owner.guard';
import { Test, TestingModule } from '@nestjs/testing';

describe('EntityOwnerGuard', () => {
  let guard: EntityOwnerGuard;
  let reflector: Reflector;
  let policyMock: Partial<MockedMethods<PolicyService>>;
  let moduleRefMock: Partial<MockedMethods<ModuleRef>>;

  beforeEach(async () => {
    reflector = new Reflector();
    policyMock = createPolicyMock();
    moduleRefMock = createMock(['get']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityOwnerGuard,
        { provide: PolicyService, useValue: policyMock },
        { provide: ModuleRef, useValue: moduleRefMock },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<EntityOwnerGuard>(EntityOwnerGuard);

    jest.clearAllMocks();
  });

  it('allows when no metadata provided (guard not configured)', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    const ctx = createMockExecutionContext({ user: { id: 'u1' }, params: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws UnauthorizedException when metadata present but no user', async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValueOnce({ serviceToken: 'SomeService' })
      .mockReturnValueOnce(undefined);

    const ctx = createMockExecutionContext({ user: null, params: { id: 'x' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('short-circuit allows when request.user.isSiteAdmin === true', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({});

    const ctx = createMockExecutionContext({
      user: { id: 'admin', isSiteAdmin: true },
      params: { id: 'x' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it(`computes isSiteAdmin when missing and allows when policyService.isSiteAdmin returns true`, async () => {
    jest
      .spyOn(reflector, 'get')
      .mockReturnValueOnce({ serviceToken: 'SomeService' })
      .mockReturnValueOnce(undefined);

    policyMock.isSiteAdmin!.mockResolvedValue(true);

    const ctx = createMockExecutionContext({
      user: { id: 'maybeAdmin' },
      params: { id: 'x' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(policyMock.isSiteAdmin).toHaveBeenCalledWith({
      id: 'maybeAdmin',
    });

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.isSiteAdmin).toBe(true);
  });

  it(`loads entity using serviceToken and allows when policyService.isOwnerOrAdmin returns true`, async () => {
    const opts = { serviceToken: 'SomeService', idParam: 'id' };
    jest
      .spyOn(reflector, 'get')
      .mockReturnValueOnce(opts)
      .mockReturnValueOnce(undefined);

    const provider = {
      getEntityById: jest
        .fn()
        .mockResolvedValue({ id: 'ent1', user: { id: 'owner1' } } as never),
    };
    moduleRefMock.get!.mockReturnValue(provider);

    policyMock.isOwnerOrAdmin!.mockResolvedValue(true);

    const ctx = createMockExecutionContext({
      user: { id: 'owner1' },
      params: { id: 'ent1' },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(moduleRefMock.get).toHaveBeenCalledWith('SomeService', {
      strict: false,
    });
    expect(provider.getEntityById).toHaveBeenCalledWith('ent1');
    expect(policyMock.isOwnerOrAdmin).toHaveBeenCalledWith(
      { id: 'owner1' },
      { id: 'ent1', user: { id: 'owner1' } }
    );

    // the guard should attach the loaded entity to request.entity
    const req = ctx.switchToHttp().getRequest();
    expect(req.entity).toEqual({ id: 'ent1', user: { id: 'owner1' } });
  });

  it('throws when provider not found', async () => {
    const opts = { serviceToken: 'MissingService', idParam: 'id' };
    jest
      .spyOn(reflector, 'get')
      .mockReturnValueOnce(opts)
      .mockReturnValueOnce(undefined);
    moduleRefMock.get!.mockReturnValue(undefined);

    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: { id: 'e1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(Error);
    expect(moduleRefMock.get).toHaveBeenCalledWith('MissingService', {
      strict: false,
    });
  });

  it('throws NotFoundException when entity missing and allowMissingEntity is false', async () => {
    const opts = {
      serviceToken: 'SomeService',
      idParam: 'id',
      allowMissingEntity: false,
    };
    jest.spyOn(reflector, 'get').mockReturnValue(opts as any);

    moduleRefMock.get!.mockReturnValue({
      getEntityById: jest.fn().mockResolvedValue(null as never),
    });

    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: { id: 'missing' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when entity missing but allowMissingEntity is true', async () => {
    const opts = {
      serviceToken: 'SomeService',
      idParam: 'id',
      allowMissingEntity: true,
    };
    jest.spyOn(reflector, 'get').mockReturnValue(opts as any);

    moduleRefMock.get!.mockReturnValue({
      getEntityById: jest.fn().mockResolvedValue(null as never),
    });

    const ctx = createMockExecutionContext({
      user: { id: 'u1' },
      params: { id: 'missing' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when policyService.isOwnerOrAdmin returns false', async () => {
    const opts = { serviceToken: 'SomeService', idParam: 'id' };
    jest.spyOn(reflector, 'get').mockReturnValue(opts);

    moduleRefMock.get!.mockReturnValue({
      getEntityById: jest
        .fn()
        .mockResolvedValue({ id: 'ent1', user: { id: 'owner2' } } as never),
    });

    policyMock.isOwnerOrAdmin!.mockResolvedValue(false);

    const ctx = createMockExecutionContext({
      user: { id: 'someoneElse' },
      params: { id: 'ent1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
