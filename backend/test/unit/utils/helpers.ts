// test/utils/factories.ts
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { BaseService } from 'src/common/abstracts/base.service';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { PolicyService } from 'src/modules/auth/policy/policy.service';
import { PolicyEntry } from 'src/modules/auth/policy/policy.types';
import { StoreRoles } from 'src/common/enums/store-roles.enum';

/**
 * Type helper to convert method signatures to jest.Mock
 */
export type MockedMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K];
};

/**
 * Create a mock ExecutionContext for guard tests.
 */
export function createMockExecutionContext(
  opts: {
    user?: any;
    params?: any;
    body?: any;
    headers?: any;
    handler?: (...args: any[]) => any;
    controller?: Record<string, any>;
  } = {}
): ExecutionContext {
  const {
    user = undefined,
    params = {},
    body = {},
    headers = {},
    handler,
    controller,
  } = opts;

  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params, body, headers }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => handler ?? ((): void => undefined),
    getClass: () => controller ?? {},
  } as unknown as ExecutionContext;
}

/**
 * Create a typed jest.Mocked partial repository mock.
 *
 * @example
 * const userRepo = createRepositoryMock<UserRepository>(['findByEmail', 'save']);
 * userRepo.findByEmail.mockResolvedValue(null);
 */
export function createRepositoryMock<Repo extends BaseRepository<any>>(
  methodNames: Array<keyof Repo> = []
): Partial<MockedMethods<Repo>> {
  const mock: any = {};

  for (const methodName of methodNames) {
    mock[methodName] = jest.fn();
  }

  return mock as Partial<MockedMethods<Repo>>;
}

/**
 * Create a typed jest.Mocked partial service mock.
 *
 * @example
 * const svc = createServiceMock<MyService>(['create', 'findOne']);
 * svc.create.mockResolvedValue({...});
 */
export function createServiceMock<Svc extends BaseService<any, any, any, any>>(
  methodNames: Array<keyof Svc> = []
): Partial<MockedMethods<Svc>> {
  const mock: any = {};

  for (const methodName of methodNames) {
    mock[methodName] = jest.fn();
  }

  return mock as Partial<MockedMethods<Svc>>;
}

/**
 * Alternative generic mock creator for any class/service
 * This is more flexible and works with any class type
 */
export function createMock<T>(
  methodNames: Array<keyof T> = []
): Partial<MockedMethods<T>> {
  const mock: any = {};

  for (const methodName of methodNames) {
    mock[methodName] = jest.fn();
  }

  return mock as Partial<MockedMethods<T>>;
}

/**
 * Create a typed jest.Mocked partial mapper mock.
 *
 * @example
 * const mapper = createMapperMock<UserMapper>(['toDto', 'toEntity']);
 * mapper.toDto.mockReturnValue(...);
 */
export function createMapperMock<Map extends BaseMapper<any, any>>(
  methodNames: Array<keyof Map> = ['toDto', 'toEntity'] as Array<keyof Map>
): Partial<MockedMethods<Map>> {
  const mock: any = {};

  for (const methodName of methodNames) {
    mock[methodName] = jest.fn();
  }

  return mock as Partial<MockedMethods<Map>>;
}

/**
 * Create a mock of HttpService with .post(...) returning an observable of { data: ... }.
 */
export function createHttpServicePostMock(returnValue: any = {}): {
  post: jest.Mock;
} {
  return {
    post: jest.fn().mockReturnValue(of({ data: returnValue })),
  };
}

/**
 * Create a guard mock factory.
 */
export function createGuardMock(result: boolean = true) {
  return jest.mocked({
    canActivate: jest.fn().mockResolvedValue(result),
  });
}

/**
 * PolicyService mock factory.
 */
export function createPolicyMock(
  overrides: Partial<Record<keyof PolicyService, jest.Mock>> = {}
): Partial<MockedMethods<PolicyService>> {
  const base: any = {
    checkPolicy: jest.fn(
      async (_user: any, _policy?: PolicyEntry, _params?: any) => false
    ),
    isSiteAdmin: jest.fn(async (_user: any) => false),
    userHasStoreRoles: jest.fn(
      async (_user: any, _storeId: string, _roles: StoreRoles[]) => false
    ),
    isOwnerOrAdmin: jest.fn(async (_user: any, _entity: any) => false),
  };

  // Apply overrides
  for (const k of Object.keys(overrides)) {
    base[k] = overrides[k];
  }

  return base as Partial<MockedMethods<PolicyService>>;
}

/**
 * Deep mock creator that creates a full mock with all methods
 * Useful when you need a complete mock of a service
 */
export function createDeepMock<T>(): jest.Mocked<T> {
  const handler: ProxyHandler<any> = {
    get: (target, prop) => {
      if (!(prop in target)) {
        if (typeof prop === 'string') {
          target[prop] = jest.fn();
        }
      }
      return target[prop];
    },
  };

  return new Proxy({}, handler) as jest.Mocked<T>;
}

/**
 * Type-safe mock factory with builder pattern
 * Provides better IDE support and type checking
 */
export class MockBuilder<T> {
  private mock: any = {};

  method<K extends keyof T>(name: K, implementation?: T[K]): this {
    if (implementation) {
      this.mock[name] = jest.fn(implementation as any);
    } else {
      this.mock[name] = jest.fn();
    }
    return this;
  }

  build(): Partial<MockedMethods<T>> {
    return this.mock as Partial<MockedMethods<T>>;
  }
}

/**
 * Helper to create mock builder
 *
 * @example
 * const userService = mockBuilder<UserService>()
 *   .method('findOne')
 *   .method('create')
 *   .build();
 *
 * userService.findOne.mockResolvedValue(user);
 */
export function mockBuilder<T>(): MockBuilder<T> {
  return new MockBuilder<T>();
}
