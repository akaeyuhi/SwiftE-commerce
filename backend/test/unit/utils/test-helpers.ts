import { ExecutionContext } from '@nestjs/common';

/**
 * Minimal ExecutionContext mock for guards that examine request.
 * Usage: guard.canActivate(createMockExecutionContext({ user, params }));
 */
export function createMockExecutionContext({
  user,
  params,
  body,
  headers,
}: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params,
        body,
        headers,
      }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

type Key<T extends object> = keyof T;

/**
 * Build simple mock for TypeORM Repository methods used in unit tests.
 * Example: mockRepo = mockRepository(['findOne', 'find', 'save'])
 */
export function mockRepository<Repository extends BaseRepository<any>>(
  methodNames: Key<Repository>[] = []
) {
  const repo: Record<Key<Repository>, jest.Mock> = {} as any;
  methodNames.forEach((m) => (repo[m] = jest.fn() as jest.Mock));
  return repo as jest.Mocked<Partial<Repository>>;
}

/**
 * Build simple mock for Service methods used in unit tests.
 * Example: mockService = mockService(['findOne', 'find', 'save'])
 */
export function mockService<Service extends BaseService<any>>(
  methodNames: Key<Service>[] = []
) {
  const service: Record<Key<Service>, jest.Mock> = {} as any;
  methodNames.forEach((m) => (service[m] = jest.fn() as jest.Mock));
  return service as jest.Mocked<Partial<Service>>;
}

/**
 * Build simple mock for Mapper methods used in unit tests.
 * Example: mockService = mockMapper(['findOne', 'find', 'save'])
 */
export function mockMapper<Mapper extends BaseMapper<any, any>>(
  methodNames: Key<Mapper>[] = ['toDto', 'toEntity']
) {
  const mapper: Record<Key<Mapper>, jest.Mock> = {} as any;
  methodNames.forEach((m) => (mapper[m] = jest.fn() as jest.Mock));
  return mapper as jest.Mocked<Partial<Mapper>>;
}

/**
 * Mock HttpService.post(...) returning an observable
 */
import { of } from 'rxjs';
import { BaseService } from 'src/common/abstracts/base.service';
import { BaseRepository } from 'src/common/abstracts/base.repository';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
export function mockHttpServicePost(returnValue: any) {
  return {
    post: jest.fn().mockReturnValue(of({ data: returnValue })),
  };
}
