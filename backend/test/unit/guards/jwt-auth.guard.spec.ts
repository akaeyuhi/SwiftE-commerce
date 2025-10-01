import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { createPolicyMock, MockedMethods } from 'test/unit/utils/helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { jest } from '@jest/globals';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let policyMock: Partial<MockedMethods<PolicyService>>;

  beforeEach(async () => {
    policyMock = createPolicyMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: PolicyService, useValue: policyMock },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);

    jest.clearAllMocks();
  });

  it('rethrows provided error', () => {
    const err = new Error('boom');
    expect(() => guard.handleRequest(err, null, null)).toThrow(err);
  });

  it('throws UnauthorizedException when no user provided', () => {
    const info = { message: 'invalid token' };
    expect(() => guard.handleRequest(null, undefined, info)).toThrow(
      UnauthorizedException
    );

    try {
      guard.handleRequest(null, undefined, info);
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      expect(String(e.message)).toMatch(/invalid token/i);
    }
  });

  it('returns user when there is no error and user exists', () => {
    const user = { id: 'u1', email: 'a@b' };
    const res = guard.handleRequest(null, user, null);
    expect(res).toBe(user);
  });
});
