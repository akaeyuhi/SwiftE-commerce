import { AiCaseTransformInterceptor } from 'src/modules/ai/interceptors/ai-case-transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import {
  createMock,
  createMockExecutionContext,
  MockedMethods,
} from 'test/unit/helpers';
/* eslint-disable camelcase */

describe('AiCaseTransformInterceptor', () => {
  let interceptor: AiCaseTransformInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: Partial<MockedMethods<CallHandler>>;

  beforeEach(() => {
    interceptor = new AiCaseTransformInterceptor();

    mockExecutionContext = createMockExecutionContext();
    mockCallHandler = createMock<CallHandler>(['handle']);
  });

  describe('request transformation', () => {
    it('should transform request body from camelCase to snake_case', async () => {
      const mockRequest = {
        body: {
          userId: '123',
          firstName: 'John',
          profileData: {
            phoneNumber: '555-0123',
            emailAddress: 'john@example.com',
          },
        },
        query: {},
      };

      // Fix: Mock the entire chain properly
      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of({}));

      await interceptor
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(mockRequest.body).toEqual({
        user_id: '123',
        first_name: 'John',
        profile_data: {
          phone_number: '555-0123',
          email_address: 'john@example.com',
        },
      });
    });

    it('should transform query parameters from camelCase to snake_case', async () => {
      const mockRequest = {
        body: {},
        query: {
          userId: '123',
          sortBy: 'createdAt',
        },
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of({}));

      await interceptor
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(mockRequest.query).toEqual({
        user_id: '123',
        sort_by: 'createdAt',
      });
    });

    it('should not transform excluded keys', async () => {
      const interceptorWithExclusions = new AiCaseTransformInterceptor([
        'id',
        'metadata',
      ]);

      const mockRequest = {
        body: {
          id: '123',
          userId: '456',
          metadata: {
            customField: 'value',
          },
        },
        query: {},
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of({}));

      await interceptorWithExclusions
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(mockRequest.body).toEqual({
        id: '123', // Not transformed
        user_id: '456',
        metadata: {
          customField: 'value', // Not transformed
        },
      });
    });
  });

  describe('response transformation', () => {
    it('should transform response from snake_case to camelCase', async () => {
      const mockRequest = {
        body: {},
        query: {},
      };

      const mockResponse = {
        user_id: '123',
        first_name: 'John',
        ai_result: {
          generated_text: 'Hello world',
          token_count: 150,
        },
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of(mockResponse));

      const result = await interceptor
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(result).toEqual({
        userId: '123',
        firstName: 'John',
        aiResult: {
          generatedText: 'Hello world',
          tokenCount: 150,
        },
      });
    });

    it('should transform arrays in response', async () => {
      const mockRequest = {
        body: {},
        query: {},
      };

      const mockResponse = {
        user_list: [
          { user_id: '1', first_name: 'John' },
          { user_id: '2', first_name: 'Jane' },
        ],
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of(mockResponse));

      const result = await interceptor
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(result).toEqual({
        userList: [
          { userId: '1', firstName: 'John' },
          { userId: '2', firstName: 'Jane' },
        ],
      });
    });

    it('should not transform excluded keys in response', async () => {
      const interceptorWithExclusions = new AiCaseTransformInterceptor([
        'id',
        'createdAt',
      ]);

      const mockRequest = {
        body: {},
        query: {},
      };

      const mockResponse = {
        id: '123',
        user_name: 'John',
        createdAt: '2024-01-01',
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of(mockResponse));

      const result = await interceptorWithExclusions
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(result).toEqual({
        id: '123', // Not transformed
        userName: 'John',
        createdAt: '2024-01-01', // Not transformed
      });
    });

    it('should handle null response', async () => {
      const mockRequest = {
        body: {},
        query: {},
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of(null));

      const result = await interceptor
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(result).toBeNull();
    });

    it('should handle primitive response', async () => {
      const mockRequest = {
        body: {},
        query: {},
      };

      const mockHttpContext = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      jest
        .spyOn(mockExecutionContext, 'switchToHttp')
        .mockReturnValue(mockHttpContext as any);

      mockCallHandler.handle!.mockReturnValue(of('success'));

      const result = await interceptor
        .intercept(mockExecutionContext, mockCallHandler as any)
        .toPromise();

      expect(result).toBe('success');
    });
  });
});
