import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { BaseService } from 'src/common/abstracts/base.service';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';
import { PolicyEntry } from 'src/modules/authorization/policy/policy.types';
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

  // Create a single request object that will be reused
  const mockRequest = { user, params, body, headers };

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest, // ← Returns the SAME object every time
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
/* eslint-disable @typescript-eslint/no-unused-vars*/
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
    isUserActive: jest.fn(async (_userId: string) => false),
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

import { EntityManager } from 'typeorm';

export function createMockEntityManager(
  ...methods: Array<keyof EntityManager>
) {
  const manager = createMock<EntityManager>([
    'createQueryBuilder',
    'connection',
    ...methods,
  ]);
  Object.assign(manager, {
    connection: {
      getMetadata: jest.fn().mockReturnValue({
        name: 'EntityName',
        tableName: 'entity_table',
        columns: [],
      }),
    },
  });
  return manager;
}

import { Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}

export const createMockInterceptor = () => new TestInterceptor();

import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { EmailQueueService } from 'src/modules/infrastructure/queues/email-queue/email-queue.service';
import { BaseQueueService } from 'src/common/abstracts/infrastucture/base.queue.service';

/**
 * Create a fully mocked AnalyticsQueueService
 * All methods return resolved promises with job IDs
 */
export function createMockAnalyticsQueue(): jest.Mocked<AnalyticsQueueService> {
  const mockJobId = () =>
    `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    // Core queue methods
    addEvent: jest.fn().mockResolvedValue(mockJobId()),
    recordView: jest.fn().mockResolvedValue(mockJobId()),
    recordLike: jest.fn().mockResolvedValue(mockJobId()),
    recordAddToCart: jest.fn().mockResolvedValue(mockJobId()),
    recordPurchase: jest.fn().mockResolvedValue(mockJobId()),
    recordClick: jest.fn().mockResolvedValue(mockJobId()),

    // Batch operations
    addBatch: jest.fn().mockResolvedValue(mockJobId()),

    // Scheduling methods
    scheduleDailyAggregation: jest.fn().mockResolvedValue(mockJobId()),
    scheduleCleanup: jest.fn().mockResolvedValue(mockJobId()),
    scheduleMetricsProcessing: jest.fn().mockResolvedValue(mockJobId()),
    scheduleReportGeneration: jest.fn().mockResolvedValue(mockJobId()),
    scheduleRecurring: jest.fn().mockResolvedValue(mockJobId()),

    // Setup and management
    setupRecurringJobs: jest.fn().mockResolvedValue(undefined),
    retryFailed: jest.fn().mockResolvedValue(0),
    purgeCompleted: jest.fn().mockResolvedValue(0),
    close: jest.fn().mockResolvedValue(undefined),

    // Base queue service methods
    scheduleJob: jest.fn().mockResolvedValue(mockJobId()),
    getJobStatus: jest.fn().mockResolvedValue({
      id: mockJobId(),
      status: 'completed',
      progress: 100,
      data: {},
    } as any),
    getQueueStatus: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 10,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    pauseQueue: jest.fn().mockResolvedValue(undefined),
    resumeQueue: jest.fn().mockResolvedValue(undefined),
    emptyQueue: jest.fn().mockResolvedValue(undefined),

    // Properties
    queueName: 'analytics',
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any,
    queue: {
      add: jest.fn().mockResolvedValue({ id: mockJobId() }),
      getJob: jest.fn().mockResolvedValue(null),
      getJobs: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      empty: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
    } as any,
  } as unknown as jest.Mocked<AnalyticsQueueService>;
}

/**
 * Create a fully mocked EmailQueueService
 * All methods return resolved promises with job IDs
 */
export function createMockEmailQueue(): jest.Mocked<EmailQueueService> {
  const mockJobId = () =>
    `email_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    // User-related emails
    sendUserConfirmation: jest.fn().mockResolvedValue(mockJobId()),
    sendWelcomeEmail: jest.fn().mockResolvedValue(mockJobId()),
    sendPasswordReset: jest.fn().mockResolvedValue(mockJobId()),
    sendRoleConfirmation: jest.fn().mockResolvedValue(mockJobId()),

    // Stock-related emails
    sendStockAlert: jest.fn().mockResolvedValue(mockJobId()),
    sendLowStockWarning: jest.fn().mockResolvedValue(mockJobId()),

    // Order-related emails
    sendOrderConfirmation: jest.fn().mockResolvedValue(mockJobId()),
    sendOrderShipped: jest.fn().mockResolvedValue(mockJobId()),
    sendOrderDelivered: jest.fn().mockResolvedValue(mockJobId()),
    sendOrderCancelled: jest.fn().mockResolvedValue(mockJobId()),

    // News emails
    sendNewsNotification: jest.fn().mockResolvedValue(mockJobId()),

    // Queue management
    scheduleRecurring: jest.fn().mockResolvedValue(mockJobId()),
    retryFailed: jest.fn().mockResolvedValue(0),
    purgeCompleted: jest.fn().mockResolvedValue(0),

    // Base queue service methods
    scheduleJob: jest.fn().mockResolvedValue(mockJobId()),
    getJobStatus: jest.fn().mockResolvedValue({
      id: mockJobId(),
      status: 'completed',
      progress: 100,
      data: {},
    } as any),
    getQueueStatus: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 10,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    pauseQueue: jest.fn().mockResolvedValue(undefined),
    resumeQueue: jest.fn().mockResolvedValue(undefined),
    emptyQueue: jest.fn().mockResolvedValue(undefined),

    // Properties
    queueName: 'email',
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any,
    queue: {
      add: jest.fn().mockResolvedValue({ id: mockJobId() }),
      getJob: jest.fn().mockResolvedValue(null),
      getJobs: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      empty: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
    } as any,
  } as unknown as jest.Mocked<EmailQueueService>;
}

/**
 * Create a generic mock for any BaseQueueService subclass
 * Useful for custom queue implementations
 */
export function createMockBaseQueue<
  T extends BaseQueueService<any>,
>(): jest.Mocked<T> {
  const mockJobId = () =>
    `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    scheduleJob: jest.fn().mockResolvedValue(mockJobId()),
    getJobStatus: jest.fn().mockResolvedValue({
      id: mockJobId(),
      status: 'completed',
      progress: 100,
      data: {},
    } as any),
    getQueueStatus: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 10,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    pauseQueue: jest.fn().mockResolvedValue(undefined),
    resumeQueue: jest.fn().mockResolvedValue(undefined),
    emptyQueue: jest.fn().mockResolvedValue(undefined),

    queueName: 'generic',
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any,
    queue: {
      add: jest.fn().mockResolvedValue({ id: mockJobId() }),
      getJob: jest.fn().mockResolvedValue(null),
      getJobs: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      empty: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
    } as any,
  } as unknown as jest.Mocked<T>;
}
