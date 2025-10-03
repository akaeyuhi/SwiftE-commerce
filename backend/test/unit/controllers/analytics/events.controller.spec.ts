import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from 'src/modules/analytics/controllers/events.controller';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import { RecordEventDto } from 'src/modules/infrastructure/queues/analytics-queue/dto/record-event.dto';
import { AnalyticsEventType } from 'src/entities/infrastructure/analytics/analytics-event.entity';
import { createMock, MockedMethods } from '../../utils/helpers';

describe('EventsController', () => {
  let controller: EventsController;
  let analyticsService: Partial<MockedMethods<AnalyticsService>>;

  beforeEach(async () => {
    analyticsService = createMock<AnalyticsService>(['trackEvent']);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: AnalyticsService, useValue: analyticsService }],
    }).compile();

    controller = module.get<EventsController>(EventsController);

    jest.clearAllMocks();
  });

  describe('recordEvent', () => {
    it('should record event successfully', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
        productId: 'p1',
      };

      analyticsService.trackEvent!.mockResolvedValue(undefined);

      await controller.recordEvent(storeId, dto);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(dto);
    });

    it('should set storeId from route when not in dto', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        eventType: AnalyticsEventType.PURCHASE,
        invokedOn: 'product',
        productId: 'p1',
        value: 99.99,
      } as any;

      analyticsService.trackEvent!.mockResolvedValue(undefined);

      await controller.recordEvent(storeId, dto);

      expect(dto.storeId).toBe(storeId);
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ storeId })
      );
    });

    it('should preserve storeId from dto when present', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.ADD_TO_CART,
        invokedOn: 'product',
        productId: 'p1',
      };

      analyticsService.trackEvent!.mockResolvedValue(undefined);

      await controller.recordEvent(storeId, dto);

      expect(dto.storeId).toBe('s1');
    });

    it('should handle different event types', async () => {
      const storeId = 's1';
      const eventTypes = [
        AnalyticsEventType.VIEW,
        AnalyticsEventType.PURCHASE,
        AnalyticsEventType.ADD_TO_CART,
        AnalyticsEventType.CHECKOUT,
      ];

      analyticsService.trackEvent!.mockResolvedValue(undefined);

      for (const eventType of eventTypes) {
        const dto: RecordEventDto = {
          storeId,
          eventType,
          invokedOn: 'product',
        };

        await controller.recordEvent(storeId, dto);

        expect(analyticsService.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({ eventType })
        );
      }
    });

    it('should handle service errors', async () => {
      const storeId = 's1';
      const dto: RecordEventDto = {
        storeId: 's1',
        eventType: AnalyticsEventType.VIEW,
        invokedOn: 'product',
      };

      analyticsService.trackEvent!.mockRejectedValue(
        new Error('Tracking failed')
      );

      await expect(controller.recordEvent(storeId, dto)).rejects.toThrow(
        'Tracking failed'
      );
    });
  });
});
