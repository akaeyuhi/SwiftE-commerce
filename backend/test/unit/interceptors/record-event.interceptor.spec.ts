import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AnalyticsQueueService } from 'src/modules/infrastructure/queues/analytics-queue/analytics-queue.service';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import {
  RECORD_EVENT_META,
  RECORD_EVENTS_MAP_META,
  RecordEventOptions,
} from 'src/common/decorators/record-event.decorator';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { createMock, MockedMethods } from 'test/unit/helpers';
import { RecordEventInterceptor } from 'src/modules/infrastructure/interceptors/record-event/record-event.interceptor';

const waitForAsync = (ms: number = 50) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('RecordEventInterceptor', () => {
  let interceptor: RecordEventInterceptor;
  let reflector: Partial<MockedMethods<Reflector>>;
  let analyticsQueue: Partial<MockedMethods<AnalyticsQueueService>>;
  let mockContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler>;
  let mockRequest: any;

  const createMockContext = (request: any = {}): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
      getClass: jest.fn().mockReturnValue(class TestController {}),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    }) as any;

  beforeEach(async () => {
    reflector = createMock<Reflector>(['get']);
    analyticsQueue = createMock<AnalyticsQueueService>([
      'addEvent',
      'recordView',
      'recordLike',
      'recordAddToCart',
      'recordPurchase',
      'recordClick',
    ]);

    mockRequest = {
      params: { storeId: 's1', productId: 'p1' },
      query: {},
      body: {},
      user: { id: 'u1', email: 'user@example.com' },
      headers: {},
    };

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ id: 'result-1' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordEventInterceptor,
        { provide: Reflector, useValue: reflector },
        { provide: AnalyticsQueueService, useValue: analyticsQueue },
      ],
    }).compile();

    interceptor = module.get<RecordEventInterceptor>(RecordEventInterceptor);

    // Suppress logger output
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });
  });

  describe('basic interception', () => {
    it('should pass through when no metadata present', async () => {
      reflector.get!.mockReturnValue(undefined);
      mockContext = createMockContext(mockRequest);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(analyticsQueue.addEvent).not.toHaveBeenCalled();
    });

    it('should pass through when request is null', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };
      reflector.get!.mockReturnValue(opts);

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
        }),
        getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
        getClass: jest.fn().mockReturnValue(class TestController {}),
      } as any;

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(analyticsQueue.addEvent).not.toHaveBeenCalled();
    });
  });

  describe('reading from handler metadata', () => {
    it('should read metadata from handler', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        storeId: 'params.storeId',
        productId: 'params.productId',
      };

      reflector.get!.mockReturnValueOnce(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        undefined
      );
    });

    it('should read metadata from controller map', async () => {
      const optsMap = {
        testHandler: {
          eventType: AnalyticsEventType.VIEW,
          storeId: 'params.storeId',
        },
      };

      reflector
        .get!.mockReturnValueOnce(undefined) // handler metadata
        .mockReturnValueOnce(optsMap); // controller metadata map

      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(reflector.get).toHaveBeenCalledWith(
        RECORD_EVENT_META,
        expect.any(Object)
      );
      expect(reflector.get).toHaveBeenCalledWith(
        RECORD_EVENTS_MAP_META,
        expect.any(Function)
      );
      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });
  });

  describe('reading values from request', () => {
    it('should read from params', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        storeId: 'params.storeId',
        productId: 'params.productId',
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        undefined
      );
    });

    it('should read from query', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        storeId: 'query.storeId',
      };

      mockRequest.query = { storeId: 's2' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's2',
        'p1',
        'u1',
        undefined
      );
    });

    it('should read from body', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        productId: 'body.productId',
      };

      mockRequest.body = { productId: 'p2' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p2',
        'u1',
        undefined
      );
    });

    it('should read from user', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        userId: 'user.id',
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        undefined
      );
    });

    it('should read from headers', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        meta: 'headers.x-custom-header',
      };

      mockRequest.headers = { 'x-custom-header': 'custom-value' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        'custom-value'
      );
    });

    it('should fallback to direct key lookup', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        storeId: 'storeId', // No prefix, should fallback
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        undefined
      );
    });
  });

  describe('reading values from result', () => {
    it('should read from result when timing is after', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        productId: 'id',
        when: 'after',
      };

      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(of({ id: 'p-from-result' }));
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p-from-result',
        'u1',
        undefined
      );
    });

    it('should read nested properties from result', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        productId: 'product.id',
        when: 'after',
      };

      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(of({ product: { id: 'nested-product-id' } }));
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'nested-product-id',
        'u1',
        undefined
      );
    });

    it('should fallback to request when result value not found', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        productId: 'nonexistent',
        when: 'after',
      };

      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(of({ id: 'result-1' }));
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      // Should fallback to params.productId
      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        undefined
      );
    });
  });

  describe('when: before vs after', () => {
    it('should execute before handler when timing is before', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        when: 'before',
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      const observable = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler
      );

      // Should return immediately without waiting
      expect(observable).toBeDefined();

      await new Promise<void>((resolve) => {
        observable.subscribe(() => resolve());
      });

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should execute after handler when timing is after', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        when: 'after',
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });

    it('should default to after when timing not specified', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });
  });

  describe('event types and convenience methods', () => {
    it('should use recordView for VIEW event', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
      expect(analyticsQueue.addEvent).not.toHaveBeenCalled();
    });

    it('should use recordLike for LIKE event', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.LIKE,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordLike!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordLike).toHaveBeenCalled();
    });

    it('should use recordAddToCart for ADD_TO_CART event', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.ADD_TO_CART,
        value: 2,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordAddToCart!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordAddToCart).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        2,
        undefined
      );
    });

    it('should use recordPurchase for PURCHASE event', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.PURCHASE,
        value: 99.99,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordPurchase!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordPurchase).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        99.99,
        undefined
      );
    });

    it('should use recordClick for CLICK event', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.CLICK,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordClick!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordClick).toHaveBeenCalled();
    });

    it('should use addEvent for custom event type', async () => {
      const opts: RecordEventOptions = {
        eventType: 'custom' as any,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.addEvent!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.addEvent).toHaveBeenCalled();
    });

    it('should fallback to addEvent when convenience method not available', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      delete analyticsQueue.recordView; // Remove convenience method
      analyticsQueue.addEvent!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.addEvent).toHaveBeenCalled();
    });
  });

  describe('invokedOn logic', () => {
    it('should infer invokedOn as product when productId present', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });

    it('should infer invokedOn as store when only storeId present', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      mockRequest.params = { storeId: 's1' }; // No productId
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });

    it('should respect explicit invokedOn option', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'store',
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });

    it('should skip event when invokedOn is product but productId missing', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      mockRequest.params = { storeId: 's1' }; // No productId
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).not.toHaveBeenCalled();
      expect(analyticsQueue.addEvent).not.toHaveBeenCalled();
    });

    it('should skip event when invokedOn is store but storeId missing', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'store',
      };

      mockRequest.params = {}; // No storeId
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).not.toHaveBeenCalled();
      expect(analyticsQueue.addEvent).not.toHaveBeenCalled();
    });
  });

  describe('value conversion and handling', () => {
    it('should convert string numbers to numbers', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.PURCHASE,
        value: 'body.amount',
      };

      mockRequest.body = { amount: '123.45' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordPurchase!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordPurchase).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        123.45,
        undefined
      );
    });

    it('should handle numeric literals', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.ADD_TO_CART,
        value: 5,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordAddToCart!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordAddToCart).toHaveBeenCalledWith(
        's1',
        'p1',
        'u1',
        5,
        undefined
      );
    });

    it('should handle null value', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        value: null as any,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });

    it('should preserve non-numeric strings', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.CUSTOM,
        value: 'body.description', // This reads from body.description
      };

      mockRequest.body = { description: 'some text' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.addEvent!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'some text', // Changed from description to value
        })
      );
    });
  });

  describe('error handling', () => {
    it('should log warning and continue on queue error', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockRejectedValue(new Error('Queue error'));

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('RecordEventInterceptor enqueue error')
      );
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should not fail request on analytics error', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockRejectedValue(
        new Error('Analytics service down')
      );

      await new Promise<void>((resolve, reject) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe({
            next: () => resolve(),
            error: (err) => reject(err),
          });
      });

      await waitForAsync();

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle null/undefined values gracefully', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        productId: 'nonexistent.path',
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalled();
    });
  });

  describe('meta handling', () => {
    it('should read meta from request', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        meta: 'body.meta',
      };

      mockRequest.body = { meta: { source: 'web' } };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith('s1', 'p1', 'u1', {
        source: 'web',
      });
    });

    it('should read meta from result', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        meta: 'metadata',
        when: 'after',
      };

      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(of({ metadata: { timestamp: 123 } }));
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith('s1', 'p1', 'u1', {
        timestamp: 123,
      });
    });

    it('should handle meta as object literal', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
        meta: { source: 'mobile', version: '1.0' } as any,
      };

      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith('s1', 'p1', 'u1', {
        source: 'mobile',
        version: '1.0',
      });
    });
  });

  describe('userId resolution', () => {
    it('should resolve userId from user.id', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      mockRequest.user = { id: 'user-123' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'user-123',
        undefined
      );
    });

    it('should fallback to user.sub when user.id not present', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      mockRequest.user = { sub: 'sub-123' };
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        'sub-123',
        undefined
      );
    });

    it('should handle missing user', async () => {
      const opts: RecordEventOptions = {
        eventType: AnalyticsEventType.VIEW,
      };

      mockRequest.user = undefined;
      reflector.get!.mockReturnValue(opts);
      mockContext = createMockContext(mockRequest);
      analyticsQueue.recordView!.mockResolvedValue(undefined as any);

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(
            mockContext as ExecutionContext,
            mockCallHandler as CallHandler
          )
          .subscribe(() => resolve());
      });

      await waitForAsync();

      expect(analyticsQueue.recordView).toHaveBeenCalledWith(
        's1',
        'p1',
        undefined,
        undefined
      );
    });
  });
});
