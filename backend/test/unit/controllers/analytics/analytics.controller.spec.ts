import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from 'src/modules/analytics/controllers/analytics.controller';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { JwtAuthGuard } from 'src/modules/authorization/guards/jwt-auth.guard';
import { AdminGuard } from 'src/modules/authorization/guards/admin.guard';
import { StoreRolesGuard } from 'src/modules/authorization/guards/store-roles.guard';
import { BadRequestException } from '@nestjs/common';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import {
  AggregationRequestDto,
  AnalyticsQueryDto,
  BatchEventsDto,
} from 'src/modules/analytics/dto';
import {
  createGuardMock,
  createMock,
  createPolicyMock,
  MockedMethods,
} from '../../../utils/helpers';
import { PolicyService } from 'src/modules/authorization/policy/policy.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: Partial<MockedMethods<AnalyticsService>>;

  beforeEach(async () => {
    const guardMock = createGuardMock();

    analyticsService = createMock<AnalyticsService>([
      'trackEvent',
      'batchTrack',
      'aggregate',
      'healthCheck',
      'getStats',
      'getSupportedAggregators',
      'getAggregationSchema',
    ]);
    const policyMock = createPolicyMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: JwtAuthGuard, useValue: guardMock },
        { provide: AdminGuard, useValue: guardMock },
        { provide: StoreRolesGuard, useValue: guardMock },
        { provide: PolicyService, useValue: policyMock },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);

    jest.clearAllMocks();
  });

  describe('recordEvent', () => {
    it('should record single event successfully', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      analyticsService.trackEvent!.mockResolvedValue(undefined);

      const result = await controller.recordEvent(storeId, dto);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        success: true,
        message: 'Event tracked successfully',
      });
    });

    it('should set storeId from route when not in dto', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      } as any;

      analyticsService.trackEvent!.mockResolvedValue(undefined);

      await controller.recordEvent(storeId, dto);

      expect(dto.storeId).toBe(storeId);
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ storeId })
      );
    });

    it('should throw BadRequestException when storeId mismatch', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        storeId: 's2', // Different from route
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      await expect(controller.recordEvent(storeId, dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.recordEvent(storeId, dto)).rejects.toThrow(
        'StoreId in body must match route parameter'
      );
    });

    it('should handle service errors', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      analyticsService.trackEvent!.mockRejectedValue(new Error('Track failed'));

      await expect(controller.recordEvent(storeId, dto)).rejects.toThrow(
        'Failed to track event: Track failed'
      );
    });
  });

  describe('recordEvents', () => {
    it('should record batch events successfully', async () => {
      const storeId = 's1';
      const dto: BatchEventsDto = {
        events: [
          {
            storeId: 's1',
            eventType: AnalyticsEventType.VIEW,
            invokedOn: 'product',
          },
          {
            storeId: 's1',
            eventType: AnalyticsEventType.PURCHASE,
            invokedOn: 'product',
          },
        ],
      } as any;

      const batchResult = {
        success: 2,
        failed: 0,
        errors: [],
      };

      analyticsService.batchTrack!.mockResolvedValue(batchResult);

      const result = await controller.recordEvents(storeId, dto);

      expect(result).toEqual({
        success: true,
        processed: 2,
        failed: 0,
        errors: undefined,
      });
    });

    it('should normalize events with route storeId', async () => {
      const storeId = 's1';
      const dto: BatchEventsDto = {
        events: [
          { eventType: AnalyticsEventType.VIEW, invokedOn: 'product' } as any,
        ],
      };

      analyticsService.batchTrack!.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });

      await controller.recordEvents(storeId, dto);

      expect(analyticsService.batchTrack).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ storeId: 's1' })])
      );
    });

    it('should throw BadRequestException for invalid events', async () => {
      const storeId = 's1';
      const dto: BatchEventsDto = {
        events: [
          {
            storeId: 's1',
            eventType: AnalyticsEventType.VIEW,
            invokedOn: 'product',
          },
          {
            storeId: 's2',
            eventType: AnalyticsEventType.VIEW,
            invokedOn: 'product',
          }, // Wrong store
        ],
      } as any;

      await expect(controller.recordEvents(storeId, dto)).rejects.toThrow(
        'All events must belong to the specified store'
      );
    });

    it('should include errors when some events fail', async () => {
      const storeId = 's1';
      const dto: BatchEventsDto = {
        events: [
          {
            storeId: 's1',
            eventType: AnalyticsEventType.VIEW,
            invokedOn: 'product',
          },
        ],
      } as any;

      const batchResult = {
        success: 0,
        failed: 1,
        errors: ['Error processing event'] as any[],
      };

      analyticsService.batchTrack!.mockResolvedValue(batchResult);

      const result = await controller.recordEvents(storeId, dto);

      expect(result.errors).toEqual(['Error processing event']);
    });
  });

  describe('getStoreAnalytics', () => {
    it('should return store analytics', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = {
        from: '2025-01-01',
        to: '2025-01-31',
      };

      const analytics = { views: 1000, purchases: 100 };
      analyticsService.aggregate!.mockResolvedValue(analytics);

      const result = await controller.getStoreAnalytics(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith('store_stats', {
        storeId,
        from: query.from,
        to: query.to,
        includeTimeseries: undefined,
      });
      expect(result).toEqual(analytics);
    });

    it('should include timeseries when requested', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = {
        includeTimeseries: true,
      };

      analyticsService.aggregate!.mockResolvedValue({});

      await controller.getStoreAnalytics(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'store_stats',
        expect.objectContaining({ includeTimeseries: true })
      );
    });
  });

  describe('getStoreConversion', () => {
    it('should return store conversion metrics', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = {};

      const conversion = { conversionRate: 0.1 };
      analyticsService.aggregate!.mockResolvedValue(conversion);

      const result = await controller.getStoreConversion(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'store_conversion',
        {
          storeId,
          from: undefined,
          to: undefined,
        }
      );
      expect(result).toEqual(conversion);
    });
  });

  describe('getProductAnalytics', () => {
    it('should return product analytics', async () => {
      const storeId = 's1';
      const productId = 'p1';
      const query: AnalyticsQueryDto = {
        from: '2025-01-01',
        to: '2025-01-31',
      };

      const analytics = { views: 200, purchases: 20 };
      analyticsService.aggregate!.mockResolvedValue(analytics);

      const result = await controller.getProductAnalytics(
        storeId,
        productId,
        query
      );

      expect(analyticsService.aggregate).toHaveBeenCalledWith('product_stats', {
        storeId,
        productId,
        from: query.from,
        to: query.to,
        includeTimeseries: undefined,
      });
      expect(result).toEqual(analytics);
    });
  });

  describe('getProductConversion', () => {
    it('should return product conversion metrics', async () => {
      const storeId = 's1';
      const productId = 'p1';
      const query: AnalyticsQueryDto = {};

      const conversion = { conversionRate: 0.15 };
      analyticsService.aggregate!.mockResolvedValue(conversion);

      const result = await controller.getProductConversion(
        storeId,
        productId,
        query
      );

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'product_conversion',
        {
          storeId,
          productId,
          from: undefined,
          to: undefined,
        }
      );
      expect(result).toEqual(conversion);
    });
  });

  describe('getTopProducts', () => {
    it('should return top products with default limit', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = {};

      const topProducts = [{ productId: 'p1', conversionRate: 0.2 }];
      analyticsService.aggregate!.mockResolvedValue(topProducts);

      const result = await controller.getTopProducts(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'top_products_by_conversion',
        expect.objectContaining({ limit: 10 })
      );
      expect(result).toEqual(topProducts);
    });

    it('should use custom limit when provided', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = { limit: 5 };

      analyticsService.aggregate!.mockResolvedValue([]);

      await controller.getTopProducts(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'top_products_by_conversion',
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('getFunnelAnalysis', () => {
    it('should return funnel analysis', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = {};

      const funnel = { stages: [] };
      analyticsService.aggregate!.mockResolvedValue(funnel);

      const result = await controller.getFunnelAnalysis(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'funnel_analysis',
        {
          storeId,
          from: undefined,
          to: undefined,
        }
      );
      expect(result).toEqual(funnel);
    });
  });

  describe('getRevenueTrends', () => {
    it('should return revenue trends', async () => {
      const storeId = 's1';
      const query: AnalyticsQueryDto = {};

      const trends = { daily: [] };
      analyticsService.aggregate!.mockResolvedValue(trends);

      const result = await controller.getRevenueTrends(storeId, query);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        'revenue_trends',
        {
          storeId,
          from: undefined,
          to: undefined,
        }
      );
      expect(result).toEqual(trends);
    });
  });

  describe('getAggregation', () => {
    it('should run custom aggregation', async () => {
      const dto: AggregationRequestDto = {
        aggregatorName: 'custom_aggregator',
        options: { storeId: 's1' },
      };

      const result = { data: 'aggregated' };
      analyticsService.aggregate!.mockResolvedValue(result);

      const response = await controller.getAggregation(dto);

      expect(analyticsService.aggregate).toHaveBeenCalledWith(
        dto.aggregatorName,
        dto.options
      );
      expect(response).toEqual(result);
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = { healthy: true, uptime: 1000 };
      analyticsService.healthCheck!.mockResolvedValue(health);

      const result = await controller.getHealth();

      expect(analyticsService.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(health);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', async () => {
      const stats = { eventsProcessed: 10000 };
      analyticsService.getStats!.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(analyticsService.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('getSupportedAggregators', () => {
    it('should return list of aggregators', async () => {
      const aggregators = ['store_stats', 'product_stats', 'funnel_analysis'];
      analyticsService.getSupportedAggregators!.mockReturnValue(aggregators);

      const result = await controller.getSupportedAggregators();

      expect(result).toEqual({
        aggregators,
        count: 3,
      });
    });
  });

  describe('getAggregationSchema', () => {
    it('should return schema for aggregator', async () => {
      const schema = { name: 'store_stats', parameters: [] };
      analyticsService.getAggregationSchema!.mockReturnValue(schema);

      const result = await controller.getAggregationSchema('store_stats');

      expect(analyticsService.getAggregationSchema).toHaveBeenCalledWith(
        'store_stats'
      );
      expect(result).toEqual(schema);
    });

    it('should throw BadRequestException for unknown aggregator', async () => {
      analyticsService.getAggregationSchema!.mockReturnValue(null);

      await expect(controller.getAggregationSchema('unknown')).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.getAggregationSchema('unknown')).rejects.toThrow(
        'Unknown aggregator: unknown'
      );
    });
  });
});
